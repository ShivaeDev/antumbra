import { it } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { session as sessionRecordSchema } from "@antumbra/domain-sessions/rows/session.ts";
import type { LogEntry, LogEvent } from "@antumbra/platform-runner/log.ts";
import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as sessionEventSelection } from "@antumbra/server-storage/records/session-event.ts";
import { selection as sessionGapSelection } from "@antumbra/server-storage/records/session-gap.ts";
import { Effect, Schema } from "effect";
import { expect } from "vitest";

const sessionId = SessionId.make("observed-root");
const registration = { runnerId: "runner", logId: "log", backends: ["claude"], imageInputBackends: [] };
const raw = { kind: "record", payload: "{}", source: "provider" };

const started: LogEvent = {
	type: "SessionStarted",
	sessionId,
	requestId: "start",
	agentId: "agent",
	backend: "claude",
	cwd: "/berth",
	nativeRef: "native-root",
	runnerId: "runner",
	toolSetVersion: "tools",
};

const said = (node: string, text: string): LogEvent => ({
	type: "ProviderEvent",
	sessionId,
	observation: "live",
	event: { type: "message", role: "agent", text, origin: { node, spawnedBy: node }, raw },
});

const called = (node: string, toolId: string): LogEvent => ({
	type: "ProviderEvent",
	sessionId,
	observation: "live",
	event: { type: "tool.started", toolId, name: "Read", input: "{}", origin: { node, spawnedBy: node }, raw },
});

const missing = (node: string, detail: string): LogEvent => ({
	type: "ProviderEvent",
	sessionId,
	observation: "audit",
	event: { type: "subsession.gap", gapKind: "census-missing", detail, origin: { node, spawnedBy: node }, raw },
});

const working = (node: string): LogEvent => ({
	type: "ProviderEvent",
	sessionId,
	observation: "live",
	event: { type: "session.state", state: "running", origin: { node, spawnedBy: node }, raw },
});

const censused = (node: string, busy: boolean): LogEvent => ({ type: "SessionCensus", sessionId, nodes: [{ nodeRef: node, working: busy }] });

const opened = (node: string): LogEvent => ({
	type: "ProviderEvent",
	sessionId,
	observation: "live",
	event: { type: "subsession.opened", subsessionRef: node, spawnedBy: node, parentRef: "native-root", raw },
});

const closed = (node: string): LogEvent => ({
	type: "ProviderEvent",
	sessionId,
	observation: "live",
	event: { type: "subsession.ended", subsessionRef: node, outcome: "completed", raw },
});

interface Appending {
	readonly append: (entries: readonly LogEntry[]) => Effect.Effect<number, unknown>;
}

const walking =
	(runner: Appending, cursor: { next: number }) =>
	(events: readonly LogEvent[]): Effect.Effect<number, unknown> =>
		runner.append(events.map((event) => ({ logId: registration.logId, at: 100, cursor: cursor.next++, event })));

const observations = Effect.gen(function* () {
	const history = yield* ExecutionHistory;
	const entries = yield* history.read();
	return yield* Effect.forEach(
		entries.filter((entry) => entry.value._tag === observed.name),
		(entry) => Schema.decodeUnknownEffect(observed.Payload)(entry.value),
	).pipe(Effect.orDie);
});

const reports = (node: string) =>
	Effect.map(observations, (payloads) => payloads.filter((payload) => payload.nodeRef === node).map((payload) => payload.evidence.type));

const censuses = Effect.map(observations, (payloads) => payloads.filter((payload) => payload.evidence.type === "census").length);

const walked = (rows: readonly { readonly id: SessionId; readonly nativeRef: string | null }[], nativeRef: string) => {
	const node = rows.find((row) => row.nativeRef === nativeRef);
	return node === undefined ? Effect.die(`the walk never recorded ${nativeRef}`) : Effect.succeed(node.id);
};

it.app("the walk reports a node once while nothing about it changes", function* (app) {
	const walk = walking(yield* connectRunner(registration), { next: 0 });
	yield* walk([started, said("alpha", "sounding the channel"), said("alpha", "the channel is clear"), said("alpha", "logging the depth")]);
	expect(yield* reports("alpha")).toEqual(["node-seen"]);
	const alpha = yield* walked(
		yield* app.rows.session
			.findMany({ where: { rootSessionId: sessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
			.pipe(Effect.orDie),
		"alpha",
	);
	expect(
		yield* app.rows.sessionEvent
			.findMany({ where: { sessionId: alpha }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionEventSelection })
			.pipe(Effect.orDie),
	).toHaveLength(3);
});

it.app("a node stays reported once across the readings that come between", function* () {
	const walk = walking(yield* connectRunner(registration), { next: 0 });
	yield* walk([started, said("alpha", "sounding the channel"), called("alpha", "call-1"), said("alpha", "the channel is clear")]);
	expect(yield* reports("alpha")).toEqual(["node-seen", "tool-called"]);
});

it.app("each node is reported for itself", function* () {
	const walk = walking(yield* connectRunner(registration), { next: 0 });
	yield* walk([started, said("alpha", "sounding the channel"), said("beta", "reading the ledger"), said("alpha", "the channel is clear")]);
	expect(yield* reports("alpha")).toEqual(["node-seen"]);
	expect(yield* reports("beta")).toEqual(["node-seen"]);
});

it.app("a reading that asserts something is written every time it is made", function* (app) {
	const walk = walking(yield* connectRunner(registration), { next: 0 });
	const finding = "1 of 1 transcript lines the provider stored for this node never reached the record";
	yield* walk([started, opened("alpha"), missing("alpha", finding)]);
	yield* walk([working("alpha"), missing("alpha", finding)]);
	expect(yield* reports("alpha")).toEqual(["gap", "activity", "gap"]);
	const alpha = yield* walked(
		yield* app.rows.session
			.findMany({ where: { rootSessionId: sessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
			.pipe(Effect.orDie),
		"alpha",
	);
	expect(
		yield* app.rows.sessionGap
			.findMany({ where: { sessionId: alpha }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionGapSelection })
			.pipe(Effect.orDie),
	).toHaveLength(2);
});

it.app("a census re-asserts what it saw even when it says what it said before", function* (app) {
	const walk = walking(yield* connectRunner(registration), { next: 0 });
	yield* walk([started, opened("alpha"), censused("alpha", false)]);
	const alpha = yield* walked(
		yield* app.rows.session
			.findMany({ where: { rootSessionId: sessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
			.pipe(Effect.orDie),
		"alpha",
	);
	expect(
		yield* app.rows.session.findById(alpha).pipe(Effect.flatMap(Schema.decodeUnknownEffect(sessionRecordSchema.Row)), Effect.orDie),
	).toMatchObject({ executionStatus: "idle" });
	yield* walk([working("alpha")]);
	expect(
		yield* app.rows.session.findById(alpha).pipe(Effect.flatMap(Schema.decodeUnknownEffect(sessionRecordSchema.Row)), Effect.orDie),
	).toMatchObject({ executionStatus: "active" });
	yield* walk([censused("alpha", false)]);
	expect(
		yield* app.rows.session.findById(alpha).pipe(Effect.flatMap(Schema.decodeUnknownEffect(sessionRecordSchema.Row)), Effect.orDie),
	).toMatchObject({ executionStatus: "idle" });
	expect(yield* censuses).toBe(2);
});

it.app("a node that closed is forgotten, so the walk reports it afresh", function* () {
	const walk = walking(yield* connectRunner(registration), { next: 0 });
	yield* walk([started, opened("alpha"), said("alpha", "sounding the channel"), closed("alpha")]);
	yield* walk([said("alpha", "the channel is clear")]);
	expect(yield* reports("alpha")).toEqual(["node-seen", "node-seen"]);
});

it.app("the first walk after a reconnect reports every node once", function* () {
	const cursor = { next: 0 };
	yield* Effect.scoped(
		Effect.gen(function* () {
			const walk = walking(yield* connectRunner(registration), cursor);
			yield* walk([started, said("alpha", "sounding the channel"), said("beta", "reading the ledger")]);
		}),
	);
	const rejoined = walking(yield* connectRunner(registration), cursor);
	yield* rejoined([said("alpha", "the channel is clear"), said("alpha", "logging the depth"), said("beta", "the ledger balances")]);
	expect(yield* reports("alpha")).toEqual(["node-seen", "node-seen"]);
	expect(yield* reports("beta")).toEqual(["node-seen", "node-seen"]);
});
