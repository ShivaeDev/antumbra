import { smoothingSessionFor } from "@antumbra/domain-boards/queries/smoothing-session-for.ts";
import type { SmoothingTarget } from "@antumbra/domain-boards/queries/smoothing-targets.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { reading } from "@antumbra/domain-sessions/queries/reading.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Boards } from "@antumbra/server-boards/service.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { Effect, Stream } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { keysOf } from "#keys.ts";

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
	const boardsService = yield* Boards;
	const sessionsService = yield* Sessions;

	const sessionId = prepared.sessionId;
	yield* boardsService
		.bindSmoothingSession({
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
		stream(keysOf(smoothingSessionFor.reads, smoothingSessionFor.scope?.({ sessionId })))(
			boardsService.smoothingSessionFor({ sessionId }).pipe(Effect.orDie),
		).pipe(Stream.filter((held) => held !== null && held.status !== "waiting")),
	).pipe(Effect.as("answered" as const));
	const ended = Stream.runHead(
		stream(keysOf(reading.reads, reading.scope?.({ id: SessionId.make(sessionId) })))(
			sessionsService.reading({ id: SessionId.make(sessionId) }).pipe(Effect.orDie),
		).pipe(Stream.filter((held) => held !== null && (held.status === "closed" || held.executionStatus === "idle"))),
	).pipe(Effect.as("silent" as const));
	const work = Effect.gen(function* () {
		const boardsService = yield* Boards;

		yield* prepared.start;
		const result = yield* Effect.raceAllFirst([finished, ended]).pipe(
			Effect.timeoutOrElse({ duration: PATIENCE_MILLIS, orElse: () => Effect.succeed("timedOut" as const) }),
		);
		const stored = yield* boardsService.smoothingSessionFor({ sessionId }).pipe(Effect.orDie);
		if (stored !== null && stored.status !== "waiting") return stored.status;
		const status = result === "timedOut" ? "timedOut" : "silent";
		yield* boardsService
			.finishSmoothingSession({ sessionId, status, requestId: Request.make(`${sessionId}:summary-${status}`) })
			.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
		return status;
	});
	return yield* work.pipe(Effect.ensuring(prepared.stop));
});
