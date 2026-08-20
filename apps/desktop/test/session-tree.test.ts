import { SightSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { rejectTestSessionMessageWrites } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import {
	AGENT_CALL,
	NATIVE_ROOT,
	NESTED_SUBSESSION,
	SUBSESSION,
} from "#test/session-tree-frames.ts";
import {
	acquireTemporaryPersistence,
	eventually,
	rehearsalLayer,
} from "#test/session-tree-harness.ts";

const spawnRequest = {
	backend: "claude",
	charter: "chart the reef",
	role: "navigator",
};

const journal = (sessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.SessionEvent.where({ sessionId })
			.orderBy((event) => event.seq.asc())
			.all();
	});

const kindsOf = (sessionId: string) =>
	journal(sessionId).pipe(Effect.map((rows) => rows.map((row) => row.kind)));

const treeOf = (rootSessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = yield* db.AgentSession.where({ rootSessionId }).all();
		const node = rows.find((row) => row.nativeRef === SUBSESSION);
		const nested = rows.find((row) => row.nativeRef === NESTED_SUBSESSION);
		expect(node).toBeDefined();
		expect(nested).toBeDefined();
		return { nested, node, rows };
	});

it.live("a delegated agent becomes a node of the Session tree", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			const tree = yield* eventually(
				Effect.gen(function* () {
					const found = yield* treeOf(receipt.sessionId);
					expect(found.rows.length).toBe(3);
					return found;
				}),
			);
			const node = tree.node;
			const nested = tree.nested;
			if (node === undefined || nested === undefined) {
				return;
			}

			expect(node).toMatchObject({
				agentId: receipt.agentId,
				completeness: "recording",
				kind: "Explore",
				label: "Map the session execution cluster",
				outcome: "completed",
				parentSessionId: receipt.sessionId,
				rootSessionId: receipt.sessionId,
				status: "closed",
			});
			// why: the depth-two node was spawned by the depth-one node's own tool
			// call, so its parent is that node and never the root that owns the
			// stream. Nothing in the frame says so; the tool call's journal does.
			expect(nested).toMatchObject({
				parentSessionId: node.id,
				rootSessionId: receipt.sessionId,
				status: "open",
			});
		}).pipe(Effect.provide(rehearsalLayer(temporary)));
	}),
);

it.live("each node's journal holds what that node did, and only that", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			const tree = yield* eventually(
				Effect.gen(function* () {
					const found = yield* treeOf(receipt.sessionId);
					expect(yield* kindsOf(receipt.sessionId)).toContain("raw");
					return found;
				}),
			);
			const node = tree.node;
			const nested = tree.nested;
			if (node === undefined || nested === undefined) {
				return;
			}

			// why: opening and ending a subsession are facts about the turn that
			// spawned it, so they sit in the spawner's journal beside the tool call
			// that did it — the delegated agent's own words are elsewhere.
			expect(yield* kindsOf(receipt.sessionId)).toEqual([
				"session.opened",
				"tool.started",
				"subsession.opened",
				"usage",
				"turn.completed",
				"subsession.ended",
				"raw",
			]);
			expect(yield* kindsOf(node.id)).toEqual([
				"session.opened",
				"message",
				"tool.started",
				"subsession.opened",
				"message",
			]);
			expect(yield* kindsOf(nested.id)).toEqual([
				"session.opened",
				"subsession.gap",
			]);
		}).pipe(Effect.provide(rehearsalLayer(temporary)));
	}),
);

it.live("the record keeps saying what it saw after the turn ended", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			const tree = yield* eventually(
				Effect.gen(function* () {
					const found = yield* treeOf(receipt.sessionId);
					expect(yield* kindsOf(receipt.sessionId)).toContain("raw");
					return found;
				}),
			);
			const node = tree.node;
			const nested = tree.nested;
			if (node === undefined || nested === undefined) {
				return;
			}

			// why: every frame from here on reached the log after the root's result,
			// which is a turn boundary and never the end of a session. A pump that
			// stopped there would have lost the ending, the report and the gap.
			const spoken = (yield* journal(node.id)).at(-1);
			expect(spoken?.payload).toContain("the cluster maps cleanly");
			// why: the notification arrives after the patch that already ended the
			// node, so its summary and its usage totals land as raw evidence rather
			// than being bent into a second ending.
			const enrichment = (yield* journal(receipt.sessionId)).at(-1);
			expect(enrichment?.payload).toContain("task_notification");
			expect(enrichment?.payload).toContain("75383");
			// why: a node whose stream stopped before it reported anything says so
			// on its own key, rather than staying open with nothing to explain it.
			const gap = (yield* journal(nested.id)).at(-1);
			expect(gap?.payload).toContain("stream-detached");
		}).pipe(Effect.provide(rehearsalLayer(temporary)));
	}),
);

it.live("a node whose journal refused an append is marked incomplete", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			yield* Effect.sync(() =>
				rejectTestSessionMessageWrites(temporary.database),
			);
			const receipt = yield* sight.spawn(spawnRequest);
			const node = yield* eventually(
				Effect.gen(function* () {
					const found = yield* treeOf(receipt.sessionId);
					expect(found.node?.status).toBe("closed");
					return found.node;
				}),
			);
			if (node === undefined) {
				return;
			}

			// why: a swallowed append would leave the node looking whole. The row
			// records the doubt outside the journal that failed, and the close that
			// follows leaves it standing — auditing the gaps is a later reading.
			expect(node.completeness).toBe("incomplete");
			expect(node.outcome).toBe("completed");
			const gaps = (yield* journal(node.id)).filter(
				(row) => row.kind === "subsession.gap",
			);
			expect(gaps.map((row) => row.payload).join("")).toContain(
				"append-failed",
			);
			// why: the opening is a fact about the spawner's turn, so a node that
			// lost its own words is still known to have existed.
			expect(yield* kindsOf(receipt.sessionId)).toContain("subsession.opened");
		}).pipe(Effect.provide(rehearsalLayer(temporary)));
	}),
);

it.live("a node's opening never stands in for the root's own identity", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			const tree = yield* eventually(
				Effect.gen(function* () {
					const found = yield* treeOf(receipt.sessionId);
					expect(found.rows.length).toBe(3);
					return found;
				}),
			);
			const root = tree.rows.find((row) => row.id === receipt.sessionId);
			// why: the root's native identity is the one the provider reported for
			// the root. A node mirrors its own provider reference onto its own row,
			// and the confirmation the attachment waits on never sees it.
			expect(root?.nativeRef).toBe(NATIVE_ROOT);
			expect(tree.node?.nativeRef).toBe(SUBSESSION);
			const opening = (yield* journal(receipt.sessionId)).find(
				(row) => row.kind === "subsession.opened",
			);
			expect(opening?.payload).toContain(AGENT_CALL);
		}).pipe(Effect.provide(rehearsalLayer(temporary)));
	}),
);
