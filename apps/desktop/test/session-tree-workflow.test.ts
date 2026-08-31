import { SightSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { claudeRehearsalIt } from "#test/session-tree-harness.ts";
import { AGENT_LATE, AGENT_ONE, AGENT_TWO, WORKFLOW_CALL, WORKFLOW_RESULT, workflowRehearsal } from "#test/session-tree-workflow-frames.ts";

const spawnRequest = {
	backend: "claude",
	charter: "audit the ledger",
	role: "purser",
};

const it = claudeRehearsalIt(workflowRehearsal);

const journal = (sessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.SessionEvent.where({ sessionId })
			.orderBy((event) => event.seq.asc())
			.all();
	}).pipe(Effect.orDie);

const kindsOf = (sessionId: string) => journal(sessionId).pipe(Effect.map((rows) => rows.map((row) => row.kind)));

const runOf = (rootSessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = yield* db.AgentSession.where({ rootSessionId }).all();
		const at = (nativeRef: string) => rows.find((row) => row.nativeRef === nativeRef);
		return {
			late: at(AGENT_LATE),
			one: at(AGENT_ONE),
			rows,
			two: at(AGENT_TWO),
		};
	}).pipe(Effect.orDie);

const settled = (rootSessionId: string) =>
	Effect.gen(function* () {
		const found = yield* runOf(rootSessionId);
		expect(found.rows.length).toBe(4);
		expect(found.late).toBeDefined();
		expect(found.one).toBeDefined();
		expect(found.two).toBeDefined();
		expect(found.late?.status).toBe("closed");
		return { ...found, late: found.late!, one: found.one!, two: found.two! };
	});

it.effectApp("every agent a workflow ran becomes a node of the Session tree", { clock: "live" }, function* ({ drained }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest).pipe(Effect.orDie);
	yield* drained;
	const run = yield* settled(receipt.sessionId);

	expect(run.one).toMatchObject({
		agentId: receipt.agentId,
		completeness: "complete",
		kind: "workflow_agent",
		label: "Audit: read the ledger",
		outcome: "completed",
		parentSessionId: receipt.sessionId,
		rootSessionId: receipt.sessionId,
		status: "closed",
	});
	expect(run.two).toMatchObject({
		kind: "workflow_agent",
		label: "Audit: chart the drifts",
		outcome: "completed",
		parentSessionId: receipt.sessionId,
	});
});

it.effectApp("each workflow agent's words are journaled under its own id", { clock: "live" }, function* ({ drained }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest).pipe(Effect.orDie);
	yield* drained;
	const run = yield* settled(receipt.sessionId);
	const one = run.one;
	const two = run.two;
	expect(yield* kindsOf(one.id)).toEqual(["session.opened", "message"]);
	expect(yield* kindsOf(two.id)).toEqual(["session.opened", "message"]);
	expect((yield* journal(one.id)).at(-1)?.payload).toContain("the ledger reads clean");
	expect((yield* journal(two.id)).at(-1)?.payload).toContain("two entries drifted");
	expect(yield* kindsOf(receipt.sessionId)).toEqual([
		"session.opened",
		"tool.started",
		"raw",
		"subsession.opened",
		"subsession.opened",
		"subsession.ended",
		"subsession.ended",
		"tool.completed",
		"subsession.opened",
		"subsession.ended",
	]);
});

it.effectApp("what the workflow returned is recovered from the stored copy", { clock: "live" }, function* ({ drained }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest).pipe(Effect.orDie);
	yield* drained;
	yield* settled(receipt.sessionId);

	const answered = (yield* journal(receipt.sessionId)).find((row) => row.kind === "tool.completed");
	expect(answered?.payload).toContain(WORKFLOW_CALL);
	expect(answered?.payload).toContain(WORKFLOW_RESULT);
	const kept = (yield* journal(receipt.sessionId)).map((row) => row.payload).join("");
	expect(kept).not.toContain("task_progress");
	expect(kept).not.toContain("promptPreview");
});

it.effectApp("an agent the mirror missed is adopted, and says it was", { clock: "live" }, function* ({ drained }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest).pipe(Effect.orDie);
	yield* drained;
	const run = yield* settled(receipt.sessionId);
	const late = run.late;
	expect(late).toMatchObject({
		completeness: "incomplete",
		kind: null,
		label: null,
		outcome: "unknown",
		parentSessionId: receipt.sessionId,
		status: "closed",
	});
	expect(yield* kindsOf(late.id)).toEqual(["session.opened", "subsession.gap", "message", "message"]);
	const gap = (yield* journal(late.id)).find((row) => row.kind === "subsession.gap");
	expect(gap?.payload).toContain("adopted-late");
});
