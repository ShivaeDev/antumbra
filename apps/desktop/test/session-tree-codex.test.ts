import { SightSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
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
import {
	acquireTemporaryPersistence,
	codexRehearsalLayer,
	eventually,
} from "#test/session-tree-harness.ts";

const spawnRequest = {
	backend: "codex",
	charter: "audit the ledger",
	role: "purser",
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
		const at = (nativeRef: string) =>
			rows.find((row) => row.nativeRef === nativeRef);
		return {
			branch: at(BRANCH_THREAD),
			leaf: at(LEAF_THREAD),
			rows,
			stray: at(STRAY_THREAD),
		};
	});

const settled = (rootSessionId: string) =>
	eventually(
		Effect.gen(function* () {
			const found = yield* treeOf(rootSessionId);
			expect(found.rows.length).toBe(4);
			expect(found.leaf?.status).toBe("closed");
			expect(found.branch?.status).toBe("closed");
			return found;
		}),
	);

const rehearsal = <A, E, R>(use: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* use.pipe(
			Effect.provide(
				codexRehearsalLayer(temporary, ROOT_THREAD, codexRehearsal),
			),
		);
	});

it.live(
	"a thread heard before it is announced becomes a node all the same",
	() =>
		rehearsal(
			Effect.gen(function* () {
				const sight = yield* SightSource;
				const receipt = yield* sight.spawn(spawnRequest);
				const tree = yield* settled(receipt.sessionId);

				// why: the record admitted this thread on its first word and was told
				// what it was afterwards, so the name filled a hole the admission left.
				// The audit at its close read the loss that says so still standing in
				// its ledger, which is the whole of what incomplete means.
				expect(tree.branch).toMatchObject({
					agentId: receipt.agentId,
					completeness: "incomplete",
					kind: BRANCH_AGENT,
					parentSessionId: receipt.sessionId,
					rootSessionId: receipt.sessionId,
				});
				// why: a thread nothing ever announced keeps the parentage the admission
				// gave it — the session that owns the stream — and says nothing about
				// what it was, because nothing ever did.
				expect(tree.stray).toMatchObject({
					completeness: "recording",
					kind: null,
					label: null,
					parentSessionId: receipt.sessionId,
					status: "open",
				});
			}),
		),
);

it.live("the announcement moves a node under the Session that spawned it", () =>
	rehearsal(
		Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			const tree = yield* settled(receipt.sessionId);
			const branch = tree.branch;
			const leaf = tree.leaf;
			if (branch === undefined || leaf === undefined) {
				return;
			}

			// why: the leaf was admitted under the root because nothing yet said
			// otherwise; the branch's own spawn call is what finally did.
			expect(leaf).toMatchObject({
				kind: LEAF_AGENT,
				outcome: "interrupted",
				parentSessionId: branch.id,
				status: "closed",
			});
			// why: its words already existed when the announcement arrived, and a
			// reader who could not tell would date the work to the moment of it.
			const gap = (yield* journal(leaf.id)).find(
				(row) => row.kind === "subsession.gap",
			);
			expect(gap?.payload).toContain("adopted-late");
			expect(yield* kindsOf(leaf.id)).toEqual([
				"session.opened",
				"message",
				"subsession.gap",
			]);
			// why: opening a node is a fact about the turn that spawned it, so the
			// leaf's opening sits in the branch's journal and not in the root's.
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
		}),
	),
);

it.live("a guardian judges the work without ever joining the tree", () =>
	rehearsal(
		Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			const tree = yield* settled(receipt.sessionId);
			const branch = tree.branch;
			if (branch === undefined) {
				return;
			}

			// why: the reviewer runs as a thread of its own, and admitting it would
			// file an auditor's transcript as work this Session did.
			expect(tree.rows.some((row) => row.nativeRef === GUARDIAN_THREAD)).toBe(
				false,
			);
			const kept = (yield* journal(branch.id))
				.map((row) => row.payload)
				.join("");
			expect(kept).not.toContain("this looks destructive");
			// why: the verdict is a fact about the thread whose action was judged,
			// so it is recorded there — with the risk and the reasoning codex gave.
			const judged = (yield* journal(branch.id)).find(
				(row) => row.kind === "raw",
			);
			expect(judged?.payload).toContain("critical");
			expect(judged?.payload).toContain("irreversible deletion");
		}),
	),
);

it.live("codex's own words for an ending are folded, never invented", () =>
	rehearsal(
		Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			const tree = yield* settled(receipt.sessionId);

			// why: interrupted is codex's declared word for a forced ending and has
			// a counterpart here; a thread merely closing declares nothing, so it
			// ends as unknown rather than being read as a success.
			expect(tree.leaf?.outcome).toBe("interrupted");
			expect(tree.branch?.outcome).toBe("unknown");
			expect(yield* kindsOf(receipt.sessionId)).toEqual([
				"session.opened",
				"subsession.opened",
				"subsession.ended",
				"message",
			]);
		}),
	),
);
