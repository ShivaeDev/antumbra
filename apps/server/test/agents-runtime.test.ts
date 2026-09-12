import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Option } from "effect";
import { expect } from "vitest";

const birthOf = (name: string) => identity(Request.make(name)).birthId;

it.app("provision refusal holds the birth and explicit retry reuses its prepared resources", function* (app) {
	const requested = Request.make("birth");
	const { agentId, birthId, sessionId } = identity(requested);
	const runner = yield* connectRunner({ runnerId: "runner", logId: "log", backends: ["claude"], imageInputBackends: [] });
	yield* app.api.agents.spawn({ requestId: requested, role: "crew", backend: "claude", model: "chosen-model", effort: "high" });
	const plan = yield* runner.next;
	expect(plan.type).toBe("Plan");
	yield* runner.reply(plan.requestId, { type: "MooragePlanned", plan: { root: "/prepared/agent", berths: [] } });
	const provision = yield* runner.next;
	expect(provision.type).toBe("Provision");
	yield* runner.reply(provision.requestId, { type: "Refused", reason: "Repository authentication required" });
	expect(yield* eventually(app.api.agents.birthBySession({ sessionId }), (birth) => birth?.status === "waiting")).toMatchObject({
		detail: "Repository authentication required",
	});
	expect(Option.getOrThrow(yield* answered(app.api.reclamation.current({ agentId })))).toMatchObject({
		root: "/prepared/agent",
		status: "provisioning",
	});
	expect(yield* answered(app.api.sessions.reading({ id: sessionId }))).toBeNull();
	yield* app.api.agents.retry({ requestId: Request.make("retry"), id: birthId });
	const retry = yield* runner.next;
	expect(retry).toMatchObject({ type: "Provision", requestId: "retry:provision", plan: { root: "/prepared/agent", berths: [] } });
	yield* runner.reply(retry.requestId, { type: "Accepted" });
	const start = yield* runner.next;
	expect(start).toMatchObject({
		type: "Start",
		requestId: "retry",
		sessionId,
		options: { cwd: "/prepared/agent", model: "chosen-model", effort: "high", toolSet: { version: "crew-v1" } },
		charter: { id: `${birthId}:charter`, parts: [{ type: "text", text: expect.stringContaining("Standing orders") }] },
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
				toolSetVersion: "crew-v1",
			},
		},
		{ logId: "log", cursor: 1, at: 0, event: { type: "InputAccepted", requestId: start.requestId, sessionId, inputId: `${birthId}:charter` } },
	]);
	expect(yield* answered(app.api.agents.byId({ id: agentId }))).toMatchObject({ status: "alive" });
	expect(yield* answered(app.api.agents.birthBySession({ sessionId }))).toMatchObject({ status: "running" });
});

it.app("raising the running budget admits the next held birth", function* (app) {
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 1 });
	for (const id of ["first", "second"]) {
		yield* app.api.agents.spawn({ requestId: Request.make(id), role: "crew", backend: "claude", model: null, effort: null });
		yield* app.clock.advance(1);
	}
	expect((yield* eventually(app.api.agents.admitted({}), (births) => births.length === 1)).map((birth) => birth.id)).toEqual([birthOf("first")]);
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 2 });
	expect((yield* eventually(app.api.agents.admitted({}), (births) => births.length === 2)).map((birth) => birth.id)).toEqual([
		birthOf("first"),
		birthOf("second"),
	]);
});
