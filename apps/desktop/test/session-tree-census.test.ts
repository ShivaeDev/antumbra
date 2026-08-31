import type { CensusSweep } from "@antumbra/backend-codex";
import { SightSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { SWEEP_REFUSED } from "#test/session-tree-audits.ts";
import { BRANCH_THREAD, codexRehearsal, ROOT_THREAD } from "#test/session-tree-codex-frames.ts";
import { codexRehearsalIt } from "#test/session-tree-harness.ts";

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

const gapsOn = (sessionId: string) =>
	journal(sessionId).pipe(Effect.map((rows) => rows.filter((row) => row.kind === "subsession.gap").map((row) => row.payload)));

codexRehearsalIt(ROOT_THREAD, codexRehearsal, oneMissed).effectApp(
	"a thread the sweep proves and the record missed is admitted",
	{ clock: "live" },
	function* ({ drained }) {
		const sight = yield* SightSource;
		const receipt = yield* sight.spawn(spawnRequest).pipe(Effect.orDie);
		yield* drained;
		const tree = yield* rowsOf(receipt.sessionId).pipe(Effect.orDie);
		expect(tree.length).toBe(5);
		const found = tree.find((row) => row.nativeRef === MISSED_THREAD);
		const branch = tree.find((row) => row.nativeRef === BRANCH_THREAD);
		expect(found).toBeDefined();
		expect(branch).toBeDefined();
		const admitted = found!;
		const parent = branch!;

		expect(admitted).toMatchObject({
			agentId: receipt.agentId,
			completeness: "recording",
			kind: "agents/purser.md",
			label: "quiet-tern",
			parentSessionId: parent.id,
			rootSessionId: receipt.sessionId,
			status: "open",
		});
		const gaps = yield* gapsOn(admitted.id).pipe(Effect.orDie);
		expect(gaps.join("")).toContain("the stream never carried it");
		expect(gaps.filter((said) => said.includes("census-missing"))).toHaveLength(1);
	},
);

codexRehearsalIt(ROOT_THREAD, codexRehearsal, [...oneMissed, sweptChild(BRANCH_THREAD, ROOT_THREAD)]).effectApp(
	"a thread the record already holds is named and left alone",
	{ clock: "live" },
	function* ({ drained }) {
		const sight = yield* SightSource;
		const receipt = yield* sight.spawn(spawnRequest).pipe(Effect.orDie);
		yield* drained;
		const tree = yield* rowsOf(receipt.sessionId).pipe(Effect.orDie);
		expect(tree.length).toBe(5);
		const branch = tree.filter((row) => row.nativeRef === BRANCH_THREAD);
		expect(branch).toHaveLength(1);
		const held = branch[0]!;

		expect((yield* gapsOn(held.id).pipe(Effect.orDie)).join("")).not.toContain("census-missing");
	},
);

codexRehearsalIt(ROOT_THREAD, codexRehearsal, SWEEP_REFUSED).effectApp(
	"a sweep that could not be taken admits nothing and says so",
	{ clock: "live" },
	function* ({ drained }) {
		const sight = yield* SightSource;
		const receipt = yield* sight.spawn(spawnRequest).pipe(Effect.orDie);
		yield* drained;
		const said = (yield* gapsOn(receipt.sessionId).pipe(Effect.orDie)).join("");
		expect(said).toContain("could not be checked");
		const rows = yield* rowsOf(receipt.sessionId).pipe(Effect.orDie);

		expect(said).toContain("unknown");
		expect(said).toContain("which threads this session delegated to");
		expect(rows.some((row) => row.nativeRef === MISSED_THREAD)).toBe(false);
		expect(rows.length).toBe(4);
	},
);
