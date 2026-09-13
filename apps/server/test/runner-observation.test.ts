import { it } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { LogEntry, LogEvent } from "@antumbra/platform-runner/log.ts";
import { Database } from "@antumbra/server-journal/database.ts";
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

const missing = (node: string, detail: string): LogEvent => ({
	type: "ProviderEvent",
	sessionId,
	observation: "audit",
	event: { type: "subsession.gap", gapKind: "census-missing", detail, origin: { node, spawnedBy: node }, raw },
});

interface Appending {
	readonly append: (entries: readonly LogEntry[]) => Effect.Effect<number, unknown>;
}

const walking =
	(runner: Appending, cursor: { next: number }) =>
	(events: readonly LogEvent[]): Effect.Effect<number, unknown> =>
		runner.append(events.map((event) => ({ logId: registration.logId, at: 100, cursor: cursor.next++, event })));

const reports = (node: string) =>
	Effect.gen(function* () {
		const database = yield* Database;
		const rows = yield* Effect.orDie(database.read`SELECT "payload" FROM "journal" WHERE "name" = ${observed.name}`);
		const decode = Schema.decodeUnknownEffect(observed.Payload);
		const payloads = yield* Effect.orDie(Effect.forEach(rows, (row) => decode(JSON.parse(String(row.payload)))));
		return payloads.filter((payload) => payload.nodeRef === node).map((payload) => payload.evidence.type);
	});

const walked = (rows: readonly { readonly id: SessionId; readonly nativeRef: string | null }[], nativeRef: string) => {
	const node = rows.find((row) => row.nativeRef === nativeRef);
	return node === undefined ? Effect.die(`the walk never recorded ${nativeRef}`) : Effect.succeed(node.id);
};

it.app("the walk reports a node once while nothing about it changes", function* (app) {
	const walk = walking(yield* connectRunner(registration), { next: 0 });
	yield* walk([started, said("alpha", "sounding the channel"), said("alpha", "the channel is clear"), said("alpha", "logging the depth")]);
	expect(yield* reports("alpha")).toEqual(["node-seen"]);
	const alpha = yield* walked(yield* app.rows.session.where({ rootSessionId: sessionId }), "alpha");
	expect(yield* app.rows.sessionEvent.where({ sessionId: alpha })).toHaveLength(3);
});

it.app("a node is reported again only when what the walk sees about it changes", function* (app) {
	const walk = walking(yield* connectRunner(registration), { next: 0 });
	const finding = "1 of 1 transcript lines the provider stored for this node never reached the record";
	yield* walk([started, said("alpha", "sounding the channel")]);
	yield* walk([missing("alpha", finding)]);
	yield* walk([missing("alpha", finding)]);
	expect(yield* reports("alpha")).toEqual(["node-seen", "gap"]);
	const alpha = yield* walked(yield* app.rows.session.where({ rootSessionId: sessionId }), "alpha");
	expect(yield* app.rows.sessionGap.where({ sessionId: alpha })).toHaveLength(1);
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
