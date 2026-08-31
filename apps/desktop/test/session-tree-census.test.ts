import type { CensusSweep } from "@antumbra/backend-codex";
import { SightSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { type ScriptedSweep, SWEEP_REFUSED } from "#test/session-tree-audits.ts";
import { BRANCH_THREAD, codexRehearsal, ROOT_THREAD } from "#test/session-tree-codex-frames.ts";
import { acquireTemporaryPersistence, codexRehearsalLayer, eventually } from "#test/session-tree-harness.ts";

const MISSED_THREAD = "019ff400-5555-7373-a31e-e8a0db309025";

const spawnRequest = {
	backend: "codex",
	charter: "audit the ledger",
	role: "purser",
};

const sweptChild = (threadId: string, parentThreadId: string) => ({
	agentNickname: undefined,
	agentPath: undefined,
	agentRole: undefined,
	parentThreadId,
	threadId,
	working: false,
});

// why: the census has one source, and it is the one reading shown to be
// complete: asked by ancestor, codex names every thread spawned below the root
// at any depth — the children whose first turn left no preview included. The
// kind-filtered listing it replaced was blind to exactly those and lost rows to
// its own pagination besides, so there is no second reading to cross-check
// against and no disagreement left to arbitrate.
const oneMissed: CensusSweep = [
	{
		agentNickname: "quiet-tern",
		agentPath: "agents/purser.md",
		agentRole: "purser",
		parentThreadId: BRANCH_THREAD,
		threadId: MISSED_THREAD,
		working: false,
	},
];

const journal = (sessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.SessionEvent.where({ sessionId })
			.orderBy((event) => event.seq.asc())
			.all();
	});

const rowsOf = (rootSessionId: string) => Database.use((db) => db.AgentSession.where({ rootSessionId }).all());

const rehearsal = <A, E, R>(sweep: ScriptedSweep, use: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* use.pipe(Effect.provide(codexRehearsalLayer(temporary, ROOT_THREAD, codexRehearsal, Effect.void, sweep)));
	});

const gapsOn = (sessionId: string) =>
	journal(sessionId).pipe(Effect.map((rows) => rows.filter((row) => row.kind === "subsession.gap").map((row) => row.payload)));

it.live("a thread the sweep proves and the record missed is admitted", () =>
	rehearsal(
		oneMissed,
		Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			const tree = yield* eventually(
				Effect.gen(function* () {
					const rows = yield* rowsOf(receipt.sessionId);
					expect(rows.length).toBe(5);
					return rows;
				}),
			);
			const found = tree.find((row) => row.nativeRef === MISSED_THREAD);
			const branch = tree.find((row) => row.nativeRef === BRANCH_THREAD);
			if (found === undefined || branch === undefined) {
				return;
			}

			// why: codex re-drives a delegated thread across activations, so a census
			// that found one says it existed and never that it stopped. The row is
			// open and still recording because nothing has heard it end. Where it
			// hangs and what ran in it are codex's own words from the sweep, not the
			// record's guess.
			expect(found).toMatchObject({
				agentId: receipt.agentId,
				completeness: "recording",
				kind: "agents/purser.md",
				label: "quiet-tern",
				parentSessionId: branch.id,
				rootSessionId: receipt.sessionId,
				status: "open",
			});
			const gaps = yield* gapsOn(found.id);
			expect(gaps.join("")).toContain("the stream never carried it");
			// why: a census is taken at every close and reads the same source each
			// time. One life, one reading, one fact — the same finding is never
			// written down twice.
			expect(gaps.filter((said) => said.includes("census-missing"))).toHaveLength(1);
		}),
	),
);

it.live("a thread the record already holds is named and left alone", () =>
	rehearsal(
		[...oneMissed, sweptChild(BRANCH_THREAD, ROOT_THREAD)],
		Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			const tree = yield* eventually(
				Effect.gen(function* () {
					const rows = yield* rowsOf(receipt.sessionId);
					expect(rows.length).toBe(5);
					return rows;
				}),
			);
			const branch = tree.filter((row) => row.nativeRef === BRANCH_THREAD);
			expect(branch).toHaveLength(1);
			const held = branch[0];
			if (held === undefined) {
				return;
			}

			// why: the sweep names every thread below the root, the ones the stream
			// carried included — so what the record already holds is the larger half
			// of the answer. Admitting those again would give one thread two rows and
			// call a node missing that was never missed.
			expect((yield* gapsOn(held.id)).join("")).not.toContain("census-missing");
		}),
	),
);

it.live("a sweep that could not be taken admits nothing and says so", () =>
	rehearsal(
		SWEEP_REFUSED,
		Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			const said = yield* eventually(
				Effect.gen(function* () {
					const gaps = yield* gapsOn(receipt.sessionId);
					expect(gaps.join("")).toContain("could not be checked");
					return gaps.join("");
				}),
			);
			const rows = yield* rowsOf(receipt.sessionId);

			// why: an unanswered question is not an empty answer. Admitting on a
			// reading that never came, or calling the session whole because nothing
			// contradicted it, are the same guess in opposite directions — so the
			// record admits nothing and says plainly that it could not check.
			expect(said).toContain("unknown");
			expect(said).toContain("which threads this session delegated to");
			expect(rows.some((row) => row.nativeRef === MISSED_THREAD)).toBe(false);
			expect(rows.length).toBe(4);
		}),
	),
);
