import { SightSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { rejectTestSessionMessageWrites } from "@antumbra/persistence/testing";
import { it as effectIt, expect } from "@effect/vitest";
import { Deferred, Effect, Stream } from "effect";
import { AGENT_CALL, NATIVE_ROOT, NESTED_SUBSESSION, SUBSESSION, streamRehearsal } from "#test/session-tree-frames.ts";
import { acquireTemporaryPersistence, claudeRehearsalIt, rehearsalLayer } from "#test/session-tree-harness.ts";

const spawnRequest = {
	backend: "claude",
	charter: "chart the reef",
	role: "navigator",
};

const it = claudeRehearsalIt(streamRehearsal);

const journal = (sessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.SessionEvent.where({ sessionId })
			.orderBy((event) => event.seq.asc())
			.all();
	}).pipe(Effect.orDie);

const kindsOf = (sessionId: string) => journal(sessionId).pipe(Effect.map((rows) => rows.map((row) => row.kind)));

const awaitKind = (sessionId: string, kind: string) =>
	Effect.gen(function* () {
		const sight = yield* SightSource;
		yield* sight.sessionEventFeed({ fromSeq: 0, sessionId }).pipe(
			Stream.filter(({ event }) => event._tag === "Known" && event.event.type === kind),
			Stream.runHead,
		);
	});

const treeOf = (rootSessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = yield* db.AgentSession.where({ rootSessionId }).all();
		const node = rows.find((row) => row.nativeRef === SUBSESSION);
		const nested = rows.find((row) => row.nativeRef === NESTED_SUBSESSION);
		expect(node).toBeDefined();
		expect(nested).toBeDefined();
		return { nested: nested!, node: node!, rows };
	}).pipe(Effect.orDie);

it.effectApp("a delegated agent becomes a node of the Session tree", { clock: "live" }, function* ({ drained }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest).pipe(Effect.orDie);
	yield* drained;
	const tree = yield* treeOf(receipt.sessionId);
	expect(tree.rows.length).toBe(3);
	const node = tree.node;
	const nested = tree.nested;
	expect(node).toMatchObject({
		agentId: receipt.agentId,
		completeness: "complete",
		kind: "Explore",
		label: "Map the session execution cluster",
		outcome: "completed",
		parentSessionId: receipt.sessionId,
		rootSessionId: receipt.sessionId,
		status: "closed",
	});
	expect(nested).toMatchObject({
		completeness: "recording",
		parentSessionId: node.id,
		rootSessionId: receipt.sessionId,
		status: "open",
	});
});

it.effectApp("each node's journal holds what that node did, and only that", { clock: "live" }, function* ({ drained }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest).pipe(Effect.orDie);
	yield* drained;
	const tree = yield* treeOf(receipt.sessionId);
	const node = tree.node;
	const nested = tree.nested;
	yield* awaitKind(nested.id, "subsession.gap");
	expect(yield* kindsOf(receipt.sessionId)).toEqual([
		"session.opened",
		"tool.started",
		"subsession.opened",
		"usage",
		"turn.completed",
		"subsession.ended",
		"raw",
	]);
	expect(yield* kindsOf(node.id)).toEqual(["session.opened", "message", "tool.started", "subsession.opened", "message"]);
	expect(yield* kindsOf(nested.id)).toEqual(["session.opened", "subsession.gap"]);
});

it.effectApp("the record keeps saying what it saw after the turn ended", { clock: "live" }, function* ({ drained }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest).pipe(Effect.orDie);
	yield* drained;
	const tree = yield* treeOf(receipt.sessionId);
	const node = tree.node;
	const nested = tree.nested;
	yield* awaitKind(nested.id, "subsession.gap");
	const spoken = (yield* journal(node.id)).at(-1);
	expect(spoken?.payload).toContain("the cluster maps cleanly");
	const enrichment = (yield* journal(receipt.sessionId)).at(-1);
	expect(enrichment?.payload).toContain("task_notification");
	expect(enrichment?.payload).toContain("75383");
	const gap = (yield* journal(nested.id)).at(-1);
	expect(gap?.payload).toContain("stream-detached");
});

effectIt.live("a node whose journal refused an append is marked incomplete", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const drained = yield* Deferred.make<void>();
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			yield* Effect.sync(() => rejectTestSessionMessageWrites(temporary.database));
			const receipt = yield* sight.spawn(spawnRequest).pipe(Effect.orDie);
			yield* Deferred.await(drained);
			const node = (yield* treeOf(receipt.sessionId)).node;
			expect(node.status).toBe("closed");
			expect(node.completeness).toBe("incomplete");
			expect(node.outcome).toBe("completed");
			const gaps = (yield* journal(node.id)).filter((row) => row.kind === "subsession.gap");
			expect(gaps.map((row) => row.payload).join("")).toContain("append-failed");
			expect(yield* kindsOf(receipt.sessionId)).toContain("subsession.opened");
		}).pipe(Effect.provide(rehearsalLayer(temporary, streamRehearsal, Deferred.succeed(drained, undefined))));
	}),
);

it.effectApp("a node's opening never stands in for the root's own identity", { clock: "live" }, function* ({ drained }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest).pipe(Effect.orDie);
	yield* drained;
	const tree = yield* treeOf(receipt.sessionId);
	expect(tree.rows.length).toBe(3);
	const root = tree.rows.find((row) => row.id === receipt.sessionId);
	expect(root?.nativeRef).toBe(NATIVE_ROOT);
	expect(tree.node?.nativeRef).toBe(SUBSESSION);
	const opening = (yield* journal(receipt.sessionId)).find((row) => row.kind === "subsession.opened");
	expect(opening?.payload).toContain(AGENT_CALL);
});
