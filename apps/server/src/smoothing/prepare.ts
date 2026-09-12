import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { smoother } from "@antumbra/domain-agents/queries/smoother.ts";
import type { smoothingAttempt } from "@antumbra/domain-boards/smoothing/attempt.ts";
import type { SmoothingTarget } from "@antumbra/domain-boards/smoothing/targets.ts";
import { resolve } from "@antumbra/domain-role-settings/queries/resolve.ts";
import { request } from "@antumbra/domain-sessions/commands/request.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { reading } from "@antumbra/domain-sessions/queries/reading.ts";
import { cancel } from "@antumbra/domain-starts/commands/cancel.ts";
import { smooth } from "@antumbra/domain-starts/commands/smooth.ts";
import { bySession } from "@antumbra/domain-starts/queries/by-session.ts";
import { pieceSmootherWords, smootherWords } from "@antumbra/platform-prompts/smoother.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Clock, Effect, Option, Stream } from "effect";
import { material } from "#smoothing/material.ts";
import { writeSummarySpec } from "#tools/boards/specs.ts";

export const prepareSmoother = Effect.fn("Smoothing.prepare")(function* (
	attempt: typeof smoothingAttempt.Row.Type,
	target: typeof SmoothingTarget.Type,
) {
	const live = yield* Live;
	const commit = yield* Commit;
	const sessionId = SessionId.make(JSON.stringify(["smoothing", attempt.id, target.board, target.coversFrom, target.coversTo]));
	const known = yield* live.read(bySession, { sessionId });
	const retained = yield* live.read(smoother, { voyageId: attempt.voyageId });
	const agentId = known?.agentId ?? retained?.id ?? AgentId.make(crypto.randomUUID());
	const settings = yield* live.read(resolve, { voyageId: attempt.voyageId, role: "smoother" });
	const tools = { version: "smoothing-v1", tools: [writeSummarySpec] };
	const charter = yield* material(target);
	const start = Effect.gen(function* () {
		if (known === null)
			yield* commit
				.commit(smooth, {
					agentId,
					sessionId,
					voyageId: attempt.voyageId,
					backend: settings.backend,
					model: settings.model,
					effort: settings.effort,
					charter,
					constrainedPrompt: target.level === "day" ? smootherWords : pieceSmootherWords,
					cwd: null,
					toolSetVersion: tools.version,
					tools: tools.tools,
					requestId: Request.make(`${sessionId}:start`),
				})
				.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
		const started = Option.getOrNull(
			yield* Stream.runHead(
				live.live(bySession, { sessionId }).pipe(Stream.filter((held) => held !== null && ["running", "ended", "cancelled"].includes(held.status))),
			),
		);
		if (started?.status !== "running") return yield* Effect.fail("the smoother session ended before its charter was delivered");
	}).pipe(Effect.mapError(String));
	const stop = Effect.gen(function* () {
		const session = yield* live.read(reading, { id: sessionId });
		if (session === null) {
			const pending = yield* live.read(bySession, { sessionId });
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
