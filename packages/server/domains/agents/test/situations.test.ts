import { knownModels } from "@antumbra/app-testing/backends.ts";
import { type App, answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner, type LogEntry } from "@antumbra/app-testing/runner.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { identity } from "#ids.ts";

const raw = { kind: "provider", payload: "{}", source: "claude" };
const { agentId, sessionId } = identity(Id.Request.make("one"));
const source = { logId: "runner", at: 100 };
const asking = { requestId: Id.Request.make("one"), role: "hand", backend: "claude" as const, model: null, effort: null };

const started: LogEntry = {
	...source,
	cursor: 0,
	event: {
		type: "SessionStarted",
		sessionId,
		requestId: "one",
		agentId,
		backend: "claude",
		cwd: "/moorage",
		nativeRef: "native",
		runnerId: "runner",
		toolSetVersion: "crew-v1",
	},
};

const accepted: LogEntry = { ...source, cursor: 1, event: { type: "InputAccepted", sessionId, requestId: "one", inputId: "charter" } };

const observed = (cursor: number, event: AgentEvent): LogEntry => ({
	...source,
	cursor,
	event: { type: "ProviderEvent", sessionId, observation: "live", event },
});

const atWork = Effect.fnUntraced(function* (app: App) {
	yield* knownModels(app.api, "claude", "opus");
	yield* app.api.agents.spawn(asking);
	yield* eventually(app.api.agents.birthBySession({ sessionId }), (held) => held?.status === "admitted");
	const runner = yield* connectRunner({ runnerId: "runner", logId: "runner", backends: [], imageInputBackends: [] });
	yield* runner.append([started, accepted]);
	return runner;
});

const standingOf = (app: App) => answered(app.api.agents.reading({ id: agentId }));

it.app("an agent whose backend has not listed its models is preparing, and says what it waits for", function* (app) {
	yield* app.api.agents.spawn(asking);
	const held = yield* eventually(app.api.agents.reading({ id: agentId }), (reading) => reading?.detail !== null);
	expect(held).toMatchObject({ detail: "waiting for claude to list its models", standing: "preparing", state: "preparing" });
});

it.app("an agent whose turn is running is working", function* (app) {
	yield* atWork(app);
	expect(yield* standingOf(app)).toMatchObject({ standing: "working", state: "working" });
});

it.app("an agent whose tool call is out waits for it, and is idle once the turn ends", function* (app) {
	const runner = yield* atWork(app);
	yield* runner.append([observed(2, { type: "tool.started", toolId: "call-1", name: "Bash", input: "{}", raw })]);
	expect(yield* eventually(app.api.agents.reading({ id: agentId }), (held) => held?.state === "waiting")).toMatchObject({
		standing: "waiting for a tool call",
	});
	yield* runner.append([
		observed(3, { type: "tool.completed", toolId: "call-1", ok: true, output: "done", raw }),
		observed(4, { type: "turn.completed", status: "completed", raw }),
	]);
	expect(yield* eventually(app.api.agents.reading({ id: agentId }), (held) => held?.state === "idle")).toMatchObject({ standing: "idle" });
});

it.app("an agent whose sub-agents are out waits for all of them", function* (app) {
	const runner = yield* atWork(app);
	yield* runner.append([
		observed(2, { type: "subsession.opened", subsessionRef: "sub-1", spawnedBy: "call-1", raw }),
		observed(3, { type: "subsession.opened", subsessionRef: "sub-2", spawnedBy: "call-2", raw }),
	]);
	expect(yield* eventually(app.api.agents.reading({ id: agentId }), (held) => held?.state === "waiting")).toMatchObject({
		standing: "waiting for 2 sub-agents",
	});
});

it.app("an agent whose background command is still running waits for it", function* (app) {
	const runner = yield* atWork(app);
	yield* runner.append([
		observed(2, { type: "session.background", tasks: [{ description: "pnpm ready", id: "task-1", kind: "bash" }], raw }),
		observed(3, { type: "turn.completed", status: "completed", raw }),
	]);
	expect(yield* eventually(app.api.agents.reading({ id: agentId }), (held) => held?.state === "waiting")).toMatchObject({
		standing: "waiting for a command",
	});
});

it.app("an agent whose work was cut off is stranded", function* (app) {
	const runner = yield* atWork(app);
	yield* runner.append([{ ...source, cursor: 2, event: { type: "SessionDetached", sessionId } }]);
	expect(yield* eventually(app.api.agents.reading({ id: agentId }), (held) => held?.state === "stranded")).toMatchObject({
		detail: "the runner lost it mid-turn — hail it to take the work back up",
		standing: "stranded",
	});
});

it.app("an agent whose runner has been torn down is asleep", function* (app) {
	const runner = yield* atWork(app);
	yield* runner.append([{ ...source, cursor: 2, event: { type: "SessionSlept", sessionId, requestId: "sleep" } }]);
	expect(yield* eventually(app.api.agents.reading({ id: agentId }), (held) => held?.state === "asleep")).toMatchObject({ standing: "asleep" });
});

it.app("a retired agent is retired", function* (app) {
	yield* app.api.agents.spawn(asking);
	yield* app.api.agents.retire({ id: agentId, requestId: Id.Request.make("retire") });
	expect(yield* eventually(app.api.agents.reading({ id: agentId }), (held) => held?.state === "retired")).toMatchObject({ standing: "retired" });
});
