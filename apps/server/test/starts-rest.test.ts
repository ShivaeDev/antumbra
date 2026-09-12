import { answered, it } from "@antumbra/app-testing/entry.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { expect } from "vitest";
import { restPass } from "#starts/rest.ts";

it.app("siesta waits for acquired background work to settle and keeps the native conversation", function* (app) {
	const sessionId = SessionId.make("session");
	const agentId = AgentId.make("agent");
	yield* app.api.starts.request({
		requestId: Request.make("birth"),
		agentId,
		sessionId,
		voyageId: null,
		pieceId: null,
		source: "direct",
		backend: "claude",
		model: null,
		effort: null,
		role: "crew",
		charter: "Survey",
		toolSetVersion: "crew-v1",
		tools: [],
	});
	yield* app.api.settings.setCount({ key: "idleSiestaMinutes", count: 1 });
	const commit = yield* Commit;
	const source = { logId: "runner", at: 0, requestId: Request.make("observed") };
	const identity = { sessionId, nodeRef: null, origin: null, operationId: "birth" };
	yield* commit.observe(observed, {
		...source,
		cursor: 0,
		payload: {
			...identity,
			evidence: { type: "started", agentId, backend: "claude", cwd: "/prepared", nativeRef: "native", runnerId: "runner", toolSetVersion: "crew-v1" },
		},
	});
	yield* commit.observe(observed, { ...source, cursor: 1, payload: { ...identity, evidence: { type: "input-accepted", inputId: "charter" } } });
	yield* commit.observe(observed, { ...source, cursor: 2, payload: { ...identity, evidence: { type: "activity", state: "idle" } } });
	yield* commit.observe(observed, { ...source, cursor: 3, payload: { ...identity, evidence: { type: "background", count: 1 } } });
	yield* app.clock.advance(60001);
	yield* restPass();
	expect(yield* answered(app.api.sessions.operations({ sessionId }))).toEqual([]);
	yield* commit.observe(observed, { ...source, cursor: 4, payload: { ...identity, evidence: { type: "background", count: 0 } } });
	yield* restPass();
	expect(yield* answered(app.api.sessions.operations({ sessionId }))).toMatchObject([{ kind: "sleep", status: "requested" }]);
	expect(yield* answered(app.api.sessions.reading({ id: sessionId }))).toMatchObject({ nativeRef: "native", status: "open", attached: true });
});
