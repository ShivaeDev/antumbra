import { Boards, smoothBodies } from "@antumbra/boards";
import type { IntentStatus, IntentSubmission } from "@antumbra/kernel";
import type { DatabaseService, WriteExecutors } from "@antumbra/persistence";
import { Effect, Option, Queue, Stream } from "effect";
import { composeCrewCharter } from "#charter-compose.ts";
import type { SpawnRefused } from "#deps.ts";
import type { ReadyPiece } from "#dispatch-policy.ts";
import {
	type DispatchState,
	holdInFlight,
	recordFailure,
	recordSuccess,
	releaseInFlight,
} from "#dispatch-state.ts";
import type { SpawnFields } from "#spawn.ts";

export interface DispatchPort {
	readonly db: DatabaseService;
	readonly patienceMillis: number;
	readonly state: DispatchState;
	readonly submit: (
		payload: SpawnFields,
	) => Effect.Effect<IntentSubmission, SpawnRefused, WriteExecutors>;
}

const TERMINAL: ReadonlySet<IntentStatus> = new Set([
	"cancelled",
	"failed",
	"succeeded",
]);

const intentDetail = (db: DatabaseService, intentId: string) =>
	db.Intent.where({ id: intentId })
		.first()
		.pipe(Effect.map((row) => Option.map(row, (intent) => intent.detail)));

const settle = (
	port: DispatchPort,
	pieceId: string,
	intentId: string,
	status: Option.Option<IntentStatus>,
) =>
	Effect.gen(function* () {
		yield* releaseInFlight(port.state, pieceId);
		if (!Option.isSome(status) || status.value !== "failed") {
			yield* recordSuccess(port.state, pieceId);
			return;
		}
		yield* recordFailure(port.state, pieceId, port.patienceMillis);
		yield* Effect.logWarning("dispatch failed", {
			detail: yield* intentDetail(port.db, intentId),
			pieceId,
		});
	});

// why: the watcher is the whole of the in-flight bookkeeping. A submitted
// spawn holds its piece until the intent reaches a terminal status, so a
// piece waiting behind a closed gate is never dispatched a second time.
const watchDispatch = (
	port: DispatchPort,
	pieceId: string,
	submission: IntentSubmission,
) =>
	submission.changes.pipe(
		Stream.takeUntil((status) => TERMINAL.has(status)),
		Stream.runLast,
		Effect.flatMap((status) => settle(port, pieceId, submission.id, status)),
		Effect.catchCause((cause) =>
			Effect.logWarning("dispatch watch failed", {
				cause: String(cause),
				pieceId,
			}).pipe(Effect.andThen(releaseInFlight(port.state, pieceId))),
		),
		Effect.andThen(Queue.offer(port.state.tick, undefined)),
	);

// why: the boards are read here, in the pass, rather than inside the pure
// composer — what a piece is told at birth is a fact about the moment it is
// dispatched, and the composer stays a function of its inputs.
const charterFor = (candidate: ReadyPiece) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const voyageSmoothLog = yield* boards
			.read({
				kind: "voyage",
				voyageId: candidate.voyage.id,
			})
			.pipe(Effect.map(smoothBodies));
		const pieceSmoothLog = yield* boards
			.read({
				kind: "piece",
				pieceId: candidate.piece.id,
			})
			.pipe(Effect.map(smoothBodies));
		return composeCrewCharter(candidate.voyage, candidate.piece, {
			pieceSmoothLog,
			voyageSmoothLog,
		});
	});

export const dispatchPiece = (port: DispatchPort, candidate: ReadyPiece) =>
	Effect.gen(function* () {
		const agentId = crypto.randomUUID();
		const pieceId = candidate.piece.id;
		const submission = yield* port.submit({
			agentId,
			backend: candidate.voyage.backend,
			charter: yield* charterFor(candidate),
			pieceId,
			// why: the sole runner in v1 — the field becomes a choice when a
			// second runner exists to choose between.
			runner: "local",
			role: candidate.piece.role,
			sessionId: crypto.randomUUID(),
		});
		yield* holdInFlight(port.state, pieceId, submission.id);
		yield* Effect.forkChild(watchDispatch(port, pieceId, submission));
		yield* Effect.logDebug("dispatched piece", { agentId, pieceId });
	});
