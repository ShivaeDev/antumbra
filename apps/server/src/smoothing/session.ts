import { bindSmoothingSession, finishSmoothingSession, smoothingSessionFor } from "@antumbra/domain-boards/smoothing/session.ts";
import type { SmoothingTarget } from "@antumbra/domain-boards/smoothing/targets.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { reading } from "@antumbra/domain-sessions/queries/reading.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Stream } from "effect";

export interface PreparedSmoother<R> {
	readonly agentId: string;
	readonly sessionId: string;
	readonly start: Effect.Effect<void, string, R>;
	readonly stop: Effect.Effect<void, never, R>;
}

const PATIENCE_MILLIS = 600_000;

export const runSmoothingSession = Effect.fn("Smoothing.session")(function* <R>(
	attemptId: string,
	target: typeof SmoothingTarget.Type,
	prepared: PreparedSmoother<R>,
) {
	const commit = yield* Commit;
	const live = yield* Live;
	const sessionId = prepared.sessionId;
	yield* commit
		.commit(bindSmoothingSession, {
			attemptId,
			agentId: prepared.agentId,
			sessionId,
			board: target.board,
			pieceId: target.pieceId,
			title: target.title,
			level: target.level,
			coversFrom: target.coversFrom,
			coversTo: target.coversTo,
			requestId: Request.make(`${sessionId}:summary-target`),
		})
		.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
	const finished = Stream.runHead(
		live.live(smoothingSessionFor, { sessionId }).pipe(Stream.filter((held) => held !== null && held.status !== "waiting")),
	).pipe(Effect.as("answered" as const));
	const ended = Stream.runHead(
		live
			.live(reading, { id: SessionId.make(sessionId) })
			.pipe(Stream.filter((held) => held !== null && (held.status === "closed" || held.executionStatus === "idle"))),
	).pipe(Effect.as("silent" as const));
	const work = Effect.gen(function* () {
		yield* prepared.start;
		const result = yield* Effect.raceAllFirst([finished, ended]).pipe(
			Effect.timeoutOrElse({ duration: PATIENCE_MILLIS, orElse: () => Effect.succeed("timedOut" as const) }),
		);
		const stored = yield* live.read(smoothingSessionFor, { sessionId });
		if (stored !== null && stored.status !== "waiting") return stored.status;
		const status = result === "timedOut" ? "timedOut" : "silent";
		yield* commit
			.commit(finishSmoothingSession, { sessionId, status, requestId: Request.make(`${sessionId}:summary-${status}`) })
			.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
		return status;
	});
	return yield* work.pipe(Effect.ensuring(prepared.stop));
});
