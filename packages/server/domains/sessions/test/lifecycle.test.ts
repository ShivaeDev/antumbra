import { answered, it } from "@antumbra/app-testing/entry.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { observed } from "#facts/observed.ts";
import { SessionId } from "#ids.ts";

const sessionId = SessionId.make("session");
const start = {
	type: "started" as const,
	agentId: "agent",
	backend: "scripted",
	cwd: "/berth",
	nativeRef: "native",
	runnerId: "runner",
	toolSetVersion: "tools",
};
const source = { logId: "runner-log", at: 100, requestId: Request.make("start") };
const identity = { sessionId, nodeRef: null, origin: null, operationId: "start" };

it.app("charter acceptance advances work while sleeping retains the conversation", function* (app) {
	const commit = yield* Commit;
	yield* commit.observe(observed, { ...source, cursor: 0, payload: { ...identity, evidence: start } });
	expect(yield* answered(app.api.sessions.reading({ id: sessionId }))).toMatchObject({ executionStatus: "idle", charterDeliveredAt: null });
	yield* commit.observe(observed, { ...source, cursor: 1, payload: { ...identity, evidence: { type: "input-accepted", inputId: "charter" } } });
	expect(yield* answered(app.api.sessions.reading({ id: sessionId }))).toMatchObject({
		executionStatus: "active",
		charterDeliveredAt: new Date(100).toISOString(),
	});
	yield* commit.observe(observed, { ...source, cursor: 2, payload: { ...identity, evidence: { type: "slept", reason: "rest" } } });
	expect(yield* answered(app.api.sessions.reading({ id: sessionId }))).toMatchObject({ attached: false, status: "open", nativeRef: "native" });
});

it.app("sleep waits for tools and rejects a delegated node as an operation target", function* (app) {
	const commit = yield* Commit;
	yield* commit.observe(observed, { ...source, cursor: 0, payload: { ...identity, evidence: start } });
	yield* commit.observe(observed, {
		...source,
		cursor: 1,
		payload: { ...identity, evidence: { type: "tool-called", callId: "call", name: "shell", input: "pwd" } },
	});
	const sleep = { sessionId, kind: "sleep" as const, inputId: null, reason: "rest", requestedAt: new Date(100).toISOString() };
	expect(yield* Effect.flip(app.api.sessions.request(sleep))).toMatchObject({ _tag: "Busy" });
	yield* commit.observe(observed, { ...source, cursor: 2, payload: { ...identity, evidence: { type: "tool-answered", callId: "call" } } });
	yield* app.api.sessions.request(sleep);
	yield* commit.observe(observed, {
		...source,
		cursor: 3,
		payload: { ...identity, evidence: { type: "opened", spawnedBy: "call", nativeRef: "child", parentRef: null, label: "Explorer", kind: "task" } },
	});
	const nodes = yield* answered(app.api.sessions.tree({ rootSessionId: sessionId }));
	const child = nodes.find((node) => node.parentSessionId !== null);
	if (child === undefined) return yield* Effect.die("Missing delegated session");
	expect(yield* Effect.flip(app.api.sessions.request({ ...sleep, sessionId: child.id }))).toMatchObject({ _tag: "Unavailable" });
});

it.app("late delegated discovery retains attribution and its gap when the node ends", function* (app) {
	const commit = yield* Commit;
	yield* commit.observe(observed, { ...source, cursor: 0, payload: { ...identity, evidence: start } });
	yield* commit.observe(observed, {
		...source,
		cursor: 1,
		payload: { ...identity, nodeRef: "child", origin: { node: "child", spawnedBy: "spawn" }, evidence: { type: "activity", state: "active" } },
	});
	yield* commit.observe(observed, {
		...source,
		cursor: 2,
		payload: { ...identity, evidence: { type: "opened", nativeRef: "child", spawnedBy: "spawn", parentRef: null, label: "Explorer", kind: "task" } },
	});
	yield* commit.observe(observed, {
		...source,
		cursor: 3,
		payload: { ...identity, evidence: { type: "closed", nativeRef: "child", outcome: "completed" } },
	});
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
