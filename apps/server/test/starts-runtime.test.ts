import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { StartId } from "@antumbra/domain-starts/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Option } from "effect";
import { expect } from "vitest";

it.app("provision refusal holds the start and explicit retry reuses its prepared resources", function* (app) {
	const id = StartId.make("birth");
	const agentId = AgentId.make("agent");
	const sessionId = SessionId.make("session");
	const runner = yield* connectRunner({ runnerId: "runner", logId: "log", backends: ["claude"], imageInputBackends: [] });
	yield* app.api.starts.request({
		requestId: Request.make(id),
		agentId,
		sessionId,
		voyageId: null,
		pieceId: null,
		source: "direct",
		backend: "claude",
		model: "chosen-model",
		effort: "high",
		role: "crew",
		charter: "Inspect the assigned reef",
		toolSetVersion: "frozen-v1",
		tools: [],
	});
	const plan = yield* runner.next;
	expect(plan.type).toBe("Plan");
	yield* runner.reply(plan.requestId, { type: "MooragePlanned", plan: { root: "/prepared/agent", berths: [] } });
	const provision = yield* runner.next;
	expect(provision.type).toBe("Provision");
	yield* runner.reply(provision.requestId, { type: "Refused", reason: "Repository authentication required" });
	expect(yield* eventually(app.api.starts.bySession({ sessionId }), (birth) => birth?.status === "waiting")).toMatchObject({
		detail: "Repository authentication required",
	});
	expect(Option.getOrThrow(yield* answered(app.api.reclamation.current({ agentId })))).toMatchObject({
		root: "/prepared/agent",
		status: "provisioning",
	});
	expect(yield* answered(app.api.sessions.reading({ id: sessionId }))).toBeNull();
	yield* app.api.starts.retry({ requestId: Request.make("retry"), id });
	const retry = yield* runner.next;
	expect(retry).toMatchObject({ type: "Provision", requestId: "retry:provision", plan: { root: "/prepared/agent", berths: [] } });
	yield* runner.reply(retry.requestId, { type: "Accepted" });
	const start = yield* runner.next;
	expect(start).toMatchObject({
		type: "Start",
		requestId: "retry",
		sessionId,
		options: { cwd: "/prepared/agent", model: "chosen-model", effort: "high", toolSet: { version: "frozen-v1", tools: [] } },
		charter: { id: "birth:charter", parts: [{ type: "text", text: "Inspect the assigned reef" }] },
	});
	yield* runner.reply(start.requestId, { type: "Accepted" });
	expect(yield* answered(app.api.sessions.reading({ id: sessionId }))).toBeNull();
	expect(yield* answered(app.api.agents.byId({ id: agentId }))).toMatchObject({ status: "spawning" });
	yield* runner.append([
		{
			logId: "log",
			cursor: 0,
			at: 0,
			event: {
				type: "SessionStarted",
				requestId: start.requestId,
				sessionId,
				agentId,
				backend: "claude",
				cwd: "/prepared/agent",
				nativeRef: "native",
				runnerId: "runner",
				toolSetVersion: "frozen-v1",
			},
		},
		{ logId: "log", cursor: 1, at: 0, event: { type: "InputAccepted", requestId: start.requestId, sessionId, inputId: "birth:charter" } },
	]);
	expect(yield* answered(app.api.agents.byId({ id: agentId }))).toMatchObject({ status: "alive" });
	expect(yield* answered(app.api.starts.bySession({ sessionId }))).toMatchObject({ status: "running" });
});

it.app("raising the running budget admits the next held birth", function* (app) {
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 1 });
	for (const id of ["first", "second"]) {
		yield* app.api.starts.request({
			requestId: Request.make(id),
			agentId: AgentId.make(id),
			sessionId: SessionId.make(`session:${id}`),
			voyageId: null,
			pieceId: null,
			source: "direct",
			backend: "claude",
			model: null,
			effort: null,
			role: "crew",
			charter: "Sound the reef",
			toolSetVersion: "crew-v1",
			tools: [],
		});
		yield* app.clock.advance(1);
	}
	expect((yield* eventually(app.api.starts.admitted({}), (births) => births.length === 1)).map((birth) => birth.id)).toEqual(["first"]);
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 2 });
	expect((yield* eventually(app.api.starts.admitted({}), (births) => births.length === 2)).map((birth) => birth.id)).toEqual(["first", "second"]);
});
