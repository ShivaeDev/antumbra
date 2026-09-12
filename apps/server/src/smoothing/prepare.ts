import { cancel } from "@antumbra/domain-agents/commands/cancel.ts";
import { smooth } from "@antumbra/domain-agents/commands/smooth.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { birthBySession } from "@antumbra/domain-agents/queries/birth-by-session.ts";
import { smoother } from "@antumbra/domain-agents/queries/smoother.ts";
import type { SmoothingTarget } from "@antumbra/domain-boards/queries/smoothing-targets.ts";
import type { smoothingAttempt } from "@antumbra/domain-boards/rows/smoothing-attempt.ts";
import { request } from "@antumbra/domain-sessions/commands/request.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { reading } from "@antumbra/domain-sessions/queries/reading.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Clock, Effect, Option, Stream } from "effect";

export const prepareSmoother = Effect.fn("Smoothing.prepare")(function* (
	attempt: typeof smoothingAttempt.Row.Type,
	target: typeof SmoothingTarget.Type,
) {
	const live = yield* Live;
	const commit = yield* Commit;
	const sessionId = SessionId.make(JSON.stringify(["smoothing", attempt.id, target.board, target.coversFrom, target.coversTo]));
	const known = yield* live.read(birthBySession, { sessionId });
	const retained = yield* live.read(smoother, { voyageId: attempt.voyageId });
	const agentId = known?.agentId ?? retained?.id ?? AgentId.make(crypto.randomUUID());
	const start = Effect.gen(function* () {
		if (known === null)
			yield* commit
				.commit(smooth, { agentId, sessionId, voyageId: attempt.voyageId, cwd: null, requestId: Request.make(`${sessionId}:start`) })
				.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
		const started = Option.getOrNull(
			yield* Stream.runHead(
				live
					.live(birthBySession, { sessionId })
					.pipe(Stream.filter((held) => held !== null && ["running", "ended", "cancelled"].includes(held.status))),
			),
		);
		if (started?.status !== "running") return yield* Effect.fail("the smoother session ended before its charter was delivered");
	}).pipe(Effect.mapError(String));
	const stop = Effect.gen(function* () {
		const session = yield* live.read(reading, { id: sessionId });
		if (session === null) {
			const pending = yield* live.read(birthBySession, { sessionId });
			if (pending !== null && (pending.status === "requested" || pending.status === "waiting"))
				yield* commit
					.commit(cancel, { id: pending.id, requestId: Request.make(`${sessionId}:cancel`) })
					.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
			return;
		}
		if (session.status === "closed") return;
		yield* commit
			.commit(request, {
				sessionId,
				kind: "stop",
				inputId: null,
				reason: "the smoothing pass finished",
				requestedAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
				requestId: Request.make(`${sessionId}:stop`),
			})
			.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
		yield* Effect.interruptible(Stream.runHead(live.live(reading, { id: sessionId }).pipe(Stream.filter((held) => held?.status === "closed"))));
	}).pipe(Effect.orDie);
	return { agentId, sessionId, start, stop };
});
