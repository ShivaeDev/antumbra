import { answered, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";

it.app("siesta waits for acquired background work to settle and keeps the native conversation", function* (app) {
	const sessionId = SessionId.make("session");
	const agentId = AgentId.make("agent");
	const runner = yield* connectRunner({ runnerId: "runner", logId: "rest-log", backends: ["claude"], imageInputBackends: [] });
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
	const plan = yield* runner.next;
	expect(plan.type).toBe("Plan");
	yield* runner.reply(plan.requestId, { type: "MooragePlanned", plan: { root: "/prepared", berths: [] } });
	const provision = yield* runner.next;
	expect(provision.type).toBe("Provision");
	yield* runner.reply(provision.requestId, { type: "Accepted" });
	const start = yield* runner.next;
	expect(start.type).toBe("Start");
	yield* runner.reply(start.requestId, { type: "Accepted" });
	const source = { logId: "rest-log", at: 0 };
	const raw = { source: "test-runner", kind: "provider", payload: "{}" };
	yield* runner.append([
		{
			...source,
			cursor: 0,
			event: {
				type: "SessionStarted",
				sessionId,
				requestId: start.requestId,
				agentId,
				backend: "claude",
				cwd: "/prepared",
				nativeRef: "native",
				runnerId: "runner",
				toolSetVersion: "crew-v1",
			},
		},
		{ ...source, cursor: 1, event: { type: "InputAccepted", requestId: start.requestId, sessionId, inputId: "birth:charter" } },
		{
			...source,
			cursor: 2,
			event: {
				type: "ProviderEvent",
				sessionId,
				observation: "live",
				event: { type: "session.background", tasks: [{ id: "survey", description: "Surveying", kind: "task" }], raw },
			},
		},
		{
			...source,
			cursor: 3,
			event: { type: "ProviderEvent", sessionId, observation: "live", event: { type: "turn.completed", status: "completed", raw } },
		},
	]);
	yield* app.clock.advance(60001);
	expect(yield* answered(app.api.agents.reading({ id: agentId }))).toMatchObject({ canSleep: false });
	expect(yield* answered(app.api.sessions.operations({ sessionId }))).toEqual([]);
	yield* runner.append([
		{
			...source,
			cursor: 4,
			at: 60001,
			event: { type: "ProviderEvent", sessionId, observation: "live", event: { type: "session.background", tasks: [], raw } },
		},
	]);
	const sleep = yield* runner.next;
	expect(sleep).toMatchObject({ type: "Sleep", sessionId });
	yield* runner.reply(sleep.requestId, { type: "Accepted" });
	yield* runner.append([{ ...source, cursor: 5, at: 60001, event: { type: "SessionSlept", sessionId, requestId: sleep.requestId } }]);
	expect(yield* answered(app.api.sessions.reading({ id: sessionId }))).toMatchObject({ nativeRef: "native", status: "open", attached: false });
	expect(yield* answered(app.api.agents.reading({ id: agentId }))).toMatchObject({ status: "alive", presence: "asleep" });
});
