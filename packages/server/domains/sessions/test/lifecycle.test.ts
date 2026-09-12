import { answered, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { SessionId } from "#ids.ts";

const sessionId = SessionId.make("session");
const registration = { runnerId: "runner", logId: "runner-log", backends: ["claude"] };
const source = { logId: "runner-log", at: 100 };
const identity = { sessionId, requestId: "start" };
const start = {
	type: "SessionStarted" as const,
	...identity,
	agentId: "agent",
	backend: "claude",
	cwd: "/berth",
	nativeRef: "native",
	runnerId: "runner",
	toolSetVersion: "tools",
};
const raw = { source: "test-runner", kind: "provider", payload: "{}" };

it.app("charter acceptance advances work while sleeping retains the conversation", function* (app) {
	const runner = yield* connectRunner(registration);
	yield* runner.append([{ ...source, cursor: 0, event: start }]);
	expect(yield* answered(app.api.sessions.reading({ id: sessionId }))).toMatchObject({ executionStatus: "idle", charterDeliveredAt: null });
	yield* runner.append([{ ...source, cursor: 1, event: { type: "InputAccepted", ...identity, inputId: "charter" } }]);
	expect(yield* answered(app.api.sessions.reading({ id: sessionId }))).toMatchObject({
		executionStatus: "active",
		charterDeliveredAt: new Date(100).toISOString(),
	});
	yield* runner.append([{ ...source, cursor: 2, event: { type: "SessionSlept", ...identity } }]);
	expect(yield* answered(app.api.sessions.reading({ id: sessionId }))).toMatchObject({ attached: false, status: "open", nativeRef: "native" });
});

it.app("sleep waits for tools and rejects a delegated node as an operation target", function* (app) {
	const runner = yield* connectRunner(registration);
	yield* runner.append([
		{ ...source, cursor: 0, event: start },
		{ ...source, cursor: 1, event: { type: "ToolCalled", sessionId, callId: "call", name: "shell", input: "pwd" } },
	]);
	const sleep = { sessionId, kind: "sleep" as const, inputId: null, reason: "rest", requestedAt: new Date(100).toISOString() };
	expect(yield* Effect.flip(app.api.sessions.request(sleep))).toMatchObject({ _tag: "Busy" });
	yield* runner.append([{ ...source, cursor: 2, event: { type: "ToolAnswered", sessionId, callId: "call", answer: { ok: true, text: "/berth" } } }]);
	yield* app.api.sessions.request(sleep);
	yield* runner.append([
		{
			...source,
			cursor: 3,
			event: {
				type: "ProviderEvent",
				sessionId,
				event: { type: "subsession.opened", subsessionRef: "child", spawnedBy: "call", label: "Explorer", kind: "task", raw },
			},
		},
	]);
	const nodes = yield* answered(app.api.sessions.tree({ rootSessionId: sessionId }));
	const child = nodes.find((node) => node.parentSessionId !== null);
	if (child === undefined) return yield* Effect.die("Missing delegated session");
	expect(yield* Effect.flip(app.api.sessions.request({ ...sleep, sessionId: child.id }))).toMatchObject({ _tag: "Unavailable" });
});

it.app("late delegated discovery retains attribution and its gap when the node ends", function* (app) {
	const runner = yield* connectRunner(registration);
	yield* runner.append([
		{ ...source, cursor: 0, event: start },
		{
			...source,
			cursor: 1,
			event: {
				type: "ProviderEvent",
				sessionId,
				event: { type: "session.state", state: "running", origin: { node: "child", spawnedBy: "spawn" }, raw },
			},
		},
		{
			...source,
			cursor: 2,
			event: {
				type: "ProviderEvent",
				sessionId,
				event: { type: "subsession.opened", subsessionRef: "child", spawnedBy: "spawn", label: "Explorer", kind: "task", raw },
			},
		},
		{
			...source,
			cursor: 3,
			event: { type: "ProviderEvent", sessionId, event: { type: "subsession.ended", subsessionRef: "child", outcome: "completed", raw } },
		},
	]);
	const nodes = yield* answered(app.api.sessions.tree({ rootSessionId: sessionId }));
	expect(nodes).toHaveLength(2);
	expect(nodes.find((node) => node.nativeRef === "child")).toMatchObject({
		parentSessionId: sessionId,
		label: "Explorer",
		status: "closed",
		outcome: "completed",
		completeness: "incomplete",
	});
});
