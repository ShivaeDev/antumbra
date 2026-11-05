import { birthBySession } from "@antumbra/domain-agents/queries/birth-by-session.ts";
import type { SmoothingTarget } from "@antumbra/domain-boards/queries/smoothing-targets.ts";
import type { smoothingAttempt } from "@antumbra/domain-boards/rows/smoothing-attempt.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { reading } from "@antumbra/domain-sessions/queries/reading.ts";
import { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Agents } from "@antumbra/server-agents/service.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { Clock, Effect, Option, Stream } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { keysOf } from "#keys.ts";

export const prepareSmoother = Effect.fn("Smoothing.prepare")(function* (
	attempt: typeof smoothingAttempt.Row.Type,
	target: typeof SmoothingTarget.Type,
) {
	const agentsService = yield* Agents;

	const sessionId = SessionId.make(Id.derive("smoothing", attempt.id, target.board, String(target.coversFrom), String(target.coversTo)));
	const known = yield* agentsService.birthBySession({ sessionId }).pipe(Effect.orDie);
	const retained = yield* agentsService.smoother({ voyageId: attempt.voyageId }).pipe(Effect.orDie);
	const agentId = known?.agentId ?? retained?.id ?? AgentId.make(Id.make());
	const start = Effect.gen(function* () {
		const agentsService = yield* Agents;

		if (known === null)
			yield* agentsService
				.smooth({ agentId, sessionId, voyageId: attempt.voyageId, cwd: null, requestId: Id.Request.make(`${sessionId}:start`) })
				.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
		const started = Option.getOrNull(
			yield* Stream.runHead(
				stream(keysOf(birthBySession.reads, birthBySession.scope?.({ sessionId })))(
					agentsService.birthBySession({ sessionId }).pipe(Effect.orDie),
				).pipe(Stream.filter((held) => held !== null && ["running", "ended", "cancelled"].includes(held.status))),
			),
		);
		if (started?.status !== "running") return yield* Effect.fail("the smoother session ended before its charter was delivered");
	}).pipe(Effect.mapError(String));
	const stop = Effect.gen(function* () {
		const sessionsService = yield* Sessions;
		const agentsService = yield* Agents;

		const session = yield* sessionsService.reading({ id: sessionId }).pipe(Effect.orDie);
		if (session === null) {
			const pending = yield* agentsService.birthBySession({ sessionId }).pipe(Effect.orDie);
			if (pending !== null && (pending.status === "requested" || pending.status === "waiting"))
				yield* agentsService
					.cancel({ id: pending.id, requestId: Id.Request.make(`${sessionId}:cancel`) })
					.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
			return;
		}
		if (session.status === "closed") return;
		yield* sessionsService
			.request({
				sessionId,
				kind: "stop",
				inputId: null,
				reason: "the smoothing pass finished",
				requestedAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
				requestId: Id.Request.make(`${sessionId}:stop`),
			})
			.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
		yield* Effect.interruptible(
			Stream.runHead(
				stream(keysOf(reading.reads, reading.scope?.({ id: sessionId })))(sessionsService.reading({ id: sessionId }).pipe(Effect.orDie)).pipe(
					Stream.filter((held) => held?.status === "closed"),
				),
			),
		);
	}).pipe(Effect.orDie);
	return { agentId, sessionId, start, stop };
});
