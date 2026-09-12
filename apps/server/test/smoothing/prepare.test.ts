import { answered, it } from "@antumbra/app-testing/entry.ts";
import { voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { pendingSmoothing, smoothingTargets } from "@antumbra/domain-boards/smoothing/targets.ts";
import { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { pending } from "@antumbra/domain-sessions/queries/pending.ts";
import { bySession } from "@antumbra/domain-starts/queries/by-session.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { smootherWords } from "@antumbra/platform-prompts/smoother.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Clock, Effect, Fiber, Option, Stream } from "effect";
import { expect } from "vitest";
import { prepareSmoother } from "#smoothing/prepare.ts";
import { runSmoothingSession } from "#smoothing/session.ts";
import { writeSummaryTool } from "#tools/boards/summary.ts";

it.app("prepares an actual constrained birth, waits for logged acceptance, and closes before reusing its smoother", function* (app) {
	const voyageId = VoyageId.make("prepared-voyage");
	yield* app.api.voyages.open({
		name: "Prepared voyage",
		northStar: "Known",
		context: "",
		kind: "voyage",
		captainBackend: null,
		captainModel: null,
		captainEffort: null,
		crewBackend: null,
		crewModel: null,
		crewEffort: null,
		requestId: Request.make(voyageId),
	});
	yield* app.api.boards.write({ board: voyageBoard(voyageId), body: "The tide turned", register: "rough", author: null });
	yield* app.api.boards.requestSmoothing({ voyageId, pieceId: null, throughToday: true, requestId: Request.make("prepared-pass") });
	const live = yield* Live;
	const attempt = (yield* live.read(pendingSmoothing, {}))[0];
	const target = (yield* live.read(smoothingTargets, { id: "prepared-pass", now: new Date(yield* Clock.currentTimeMillis).toISOString() }))[0];
	if (attempt === undefined || target === undefined) return yield* Effect.die("the pass has no target");
	const prepared = yield* prepareSmoother(attempt, target);
	const sessionId = SessionId.make(prepared.sessionId);
	const run = yield* Effect.forkChild(runSmoothingSession(attempt.id, target, prepared));
	const held = Option.getOrThrow(yield* Stream.runHead(live.live(bySession, { sessionId }).pipe(Stream.filter((value) => value !== null))));
	if (held === null) return yield* Effect.die("the birth was not recorded");
	expect(held).toMatchObject({
		agentId: prepared.agentId,
		constrainedPrompt: smootherWords,
		cwd: null,
		toolSetVersion: "smoothing-v1",
		tools: [{ name: "write_summary" }],
	});
	expect(held.charter).toContain("The tide turned");
	yield* app.api.starts.admit({ id: held.id });
	const commit = yield* Commit;
	const source = { logId: "smoother-runner", at: 100, requestId: Request.make("smoother-log") };
	const identity = { sessionId, nodeRef: null, origin: null, operationId: held.operationRequestId };
	yield* commit.observe(observed, {
		...source,
		cursor: 0,
		payload: {
			...identity,
			evidence: {
				type: "started",
				agentId: prepared.agentId,
				backend: held.backend,
				cwd: "/smoother",
				nativeRef: "native",
				runnerId: "runner",
				toolSetVersion: "smoothing-v1",
			},
		},
	});
	yield* commit.observe(observed, { ...source, cursor: 1, payload: { ...identity, evidence: { type: "input-accepted", inputId: "charter" } } });
	yield* writeSummaryTool.invoke({ agentId: prepared.agentId, sessionId, callId: "summary" }, { text: "The tide changed the approach" });
	yield* Stream.runHead(
		live.live(pending, {}).pipe(Stream.filter((values) => values.some((value) => value.sessionId === sessionId && value.kind === "stop"))),
	);
	yield* commit.observe(observed, { ...source, cursor: 2, payload: { ...identity, evidence: { type: "ended", reason: "summary received" } } });
	expect(yield* Fiber.join(run)).toBe("written");
	expect(yield* answered(app.api.agents.smoother({ voyageId }))).toMatchObject({ id: prepared.agentId, status: "alive", currentSessionId: null });
	const next = yield* prepareSmoother({ ...attempt, id: "next-pass" }, target);
	expect(next.agentId).toBe(prepared.agentId);
	expect(next.sessionId).not.toBe(sessionId);
});
