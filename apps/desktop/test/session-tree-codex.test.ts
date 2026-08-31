import { SightSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import {
	BRANCH_AGENT,
	BRANCH_THREAD,
	codexRehearsal,
	GUARDIAN_THREAD,
	LEAF_AGENT,
	LEAF_THREAD,
	ROOT_THREAD,
	STRAY_THREAD,
} from "#test/session-tree-codex-frames.ts";
import { codexRehearsalIt } from "#test/session-tree-harness.ts";

const spawnRequest = {
	backend: "codex",
	charter: "audit the ledger",
	role: "purser",
};

const it = codexRehearsalIt(ROOT_THREAD, codexRehearsal);

const journal = (sessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.SessionEvent.where({ sessionId })
			.orderBy((event) => event.seq.asc())
			.all();
	}).pipe(Effect.orDie);

const kindsOf = (sessionId: string) => journal(sessionId).pipe(Effect.map((rows) => rows.map((row) => row.kind)));

const treeOf = (rootSessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = yield* db.AgentSession.where({ rootSessionId }).all();
		const at = (nativeRef: string) => rows.find((row) => row.nativeRef === nativeRef);
		return {
			branch: at(BRANCH_THREAD),
			leaf: at(LEAF_THREAD),
			rows,
			stray: at(STRAY_THREAD),
		};
	}).pipe(Effect.orDie);

const settled = (rootSessionId: string) =>
	Effect.gen(function* () {
		const found = yield* treeOf(rootSessionId);
		expect(found.rows.length).toBe(4);
		expect(found.leaf).toBeDefined();
		expect(found.branch).toBeDefined();
		expect(found.leaf?.status).toBe("closed");
		expect(found.branch?.status).toBe("closed");
		return { ...found, branch: found.branch!, leaf: found.leaf! };
	});

it.effectApp("a thread heard before it is announced becomes a node all the same", { clock: "live" }, function* ({ drained }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest).pipe(Effect.orDie);
	yield* drained;
	const tree = yield* settled(receipt.sessionId);

	expect(tree.branch).toMatchObject({
		agentId: receipt.agentId,
		completeness: "incomplete",
		kind: BRANCH_AGENT,
		parentSessionId: receipt.sessionId,
		rootSessionId: receipt.sessionId,
	});
	expect(tree.stray).toMatchObject({
		completeness: "recording",
		kind: null,
		label: null,
		parentSessionId: receipt.sessionId,
		status: "open",
	});
});

it.effectApp("the announcement moves a node under the Session that spawned it", { clock: "live" }, function* ({ drained }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest).pipe(Effect.orDie);
	yield* drained;
	const tree = yield* settled(receipt.sessionId);
	const branch = tree.branch;
	const leaf = tree.leaf;
	expect(leaf).toMatchObject({
		kind: LEAF_AGENT,
		outcome: "interrupted",
		parentSessionId: branch.id,
		status: "closed",
	});
	const gap = (yield* journal(leaf.id)).find((row) => row.kind === "subsession.gap");
	expect(gap?.payload).toContain("adopted-late");
	expect(yield* kindsOf(leaf.id)).toEqual(["session.opened", "message", "subsession.gap"]);
	expect(yield* kindsOf(branch.id)).toEqual([
		"session.opened",
		"message",
		"subsession.gap",
		"tool.started",
		"subsession.opened",
		"raw",
		"usage",
		"subsession.ended",
	]);
});

it.effectApp("a guardian judges the work without ever joining the tree", { clock: "live" }, function* ({ drained }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest).pipe(Effect.orDie);
	yield* drained;
	const tree = yield* settled(receipt.sessionId);
	const branch = tree.branch;
	expect(tree.rows.some((row) => row.nativeRef === GUARDIAN_THREAD)).toBe(false);
	const kept = (yield* journal(branch.id)).map((row) => row.payload).join("");
	expect(kept).not.toContain("this looks destructive");
	const judged = (yield* journal(branch.id)).find((row) => row.kind === "raw");
	expect(judged?.payload).toContain("critical");
	expect(judged?.payload).toContain("irreversible deletion");
});

it.effectApp("codex's own words for an ending are folded, never invented", { clock: "live" }, function* ({ drained }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest).pipe(Effect.orDie);
	yield* drained;
	const tree = yield* settled(receipt.sessionId);

	expect(tree.leaf?.outcome).toBe("interrupted");
	expect(tree.branch?.outcome).toBe("unknown");
	expect(yield* kindsOf(receipt.sessionId)).toEqual(["session.opened", "subsession.opened", "subsession.ended", "message"]);
});
