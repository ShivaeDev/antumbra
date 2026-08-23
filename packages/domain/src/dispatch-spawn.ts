import type { IntentStatus, IntentSubmission } from "@antumbra/kernel";
import type { WriteExecutors } from "@antumbra/persistence";
import { Effect, Option, Queue, Stream } from "effect";
import { charterFor } from "#crew-charter.ts";
import { accountOfIntent } from "#dispatch-failure-account.ts";
import type { ReadyPiece } from "#dispatch-policy.ts";
import {
	type DispatchState,
	holdInFlight,
	recordFailure,
	recordSuccess,
	releaseInFlight,
} from "#dispatch-state.ts";
import type { SpawnRefused } from "#kernel-reach.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export interface DispatchPort {
	readonly patienceMillis: number;
	readonly state: DispatchState;
	readonly resume: (
		sessionId: string,
	) => Effect.Effect<IntentSubmission, SpawnRefused, WriteExecutors>;
	readonly submit: (
		payload: SpawnFields,
	) => Effect.Effect<IntentSubmission, SpawnRefused, WriteExecutors>;
}

export type DispatchTarget =
	| { readonly _tag: "resume"; readonly sessionId: string }
	| { readonly _tag: "spawn" };

const TERMINAL: ReadonlySet<IntentStatus> = new Set([
	"cancelled",
	"failed",
	"succeeded",
]);

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
		const intent = yield* accountOfIntent(intentId);
		yield* Effect.logWarning("dispatch failed", {
			detail: intent.detail,
			intentId,
			pieceId,
			status: intent.status,
			tag: intent.tag,
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

export const dispatchPiece = (
	port: DispatchPort,
	candidate: ReadyPiece,
	target: DispatchTarget,
) =>
	Effect.gen(function* () {
		const pieceId = candidate.piece.id;
		if (target._tag === "resume") {
			const submission = yield* port.resume(target.sessionId);
			yield* holdInFlight(port.state, pieceId, submission.id);
			yield* Effect.forkChild(watchDispatch(port, pieceId, submission));
			yield* Effect.logDebug("resumed assigned piece", {
				pieceId,
				sessionId: target.sessionId,
			});
			return;
		}
		const agentId = crypto.randomUUID();
		const submission = yield* port.submit({
			agentId,
			backend: candidate.voyage.backend,
			charter: yield* charterFor(candidate.piece, candidate.voyage),
			pieceId,
			// why: the sole runner in v1 — the field becomes a choice when a
			// second runner exists to choose between.
			runner: "local",
			role: candidate.piece.role,
			sessionId: crypto.randomUUID(),
			voyageId: candidate.voyage.id,
		});
		yield* holdInFlight(port.state, pieceId, submission.id);
		yield* Effect.forkChild(watchDispatch(port, pieceId, submission));
		yield* Effect.logDebug("dispatched piece", { agentId, pieceId });
	});
