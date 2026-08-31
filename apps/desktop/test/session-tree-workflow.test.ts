import { SightSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect } from "effect";
import { acquireTemporaryPersistence, rehearsalLayer } from "#test/session-tree-harness.ts";
import { AGENT_LATE, AGENT_ONE, AGENT_TWO, WORKFLOW_CALL, WORKFLOW_RESULT, workflowRehearsal } from "#test/session-tree-workflow-frames.ts";

const spawnRequest = {
	backend: "claude",
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
	});

const settled = (rootSessionId: string) =>
	Effect.gen(function* () {
		const found = yield* runOf(rootSessionId);
		expect(found.rows.length).toBe(4);
		expect(found.late?.status).toBe("closed");
		return found;
	});

const rehearsal = <A, E, R>(use: (drained: Effect.Effect<void>) => Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const drained = yield* Deferred.make<void>();
		yield* use(Deferred.await(drained)).pipe(Effect.provide(rehearsalLayer(temporary, workflowRehearsal, Deferred.succeed(drained, undefined))));
	});

it.live("every agent a workflow ran becomes a node of the Session tree", () =>
	rehearsal((drained) =>
		Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			yield* drained;
			const run = yield* settled(receipt.sessionId);

			// why: the agents say nothing on the stream, so their rows exist only
			// because the mirrored transcript was read. They inherit the Agent, the
			// root and the workspace from the row that owns the tree, and they are
			// parented on the Session that called the workflow — never on each other
			// and never on the tool call they happen to share.
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
		}),
	),
);

it.live("each workflow agent's words are journaled under its own id", () =>
	rehearsal((drained) =>
		Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			yield* drained;
			const run = yield* settled(receipt.sessionId);
			const one = run.one;
			const two = run.two;
			if (one === undefined || two === undefined) {
				return;
			}

			expect(yield* kindsOf(one.id)).toEqual(["session.opened", "message"]);
			expect(yield* kindsOf(two.id)).toEqual(["session.opened", "message"]);
			// why: siblings of one fanned-out tool call would all read as the last
			// of them to open if attribution joined on the call, so each journal is
			// checked for its own agent's words and not its neighbour's.
			expect((yield* journal(one.id)).at(-1)?.payload).toContain("the ledger reads clean");
			expect((yield* journal(two.id)).at(-1)?.payload).toContain("two entries drifted");
			// why: opening and ending a node are facts about the turn that spawned
			// it, so they sit in the caller's journal beside the call that did it.
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
		}),
	),
);

it.live("what the workflow returned is recovered from the stored copy", () =>
	rehearsal((drained) =>
		Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			yield* drained;
			yield* settled(receipt.sessionId);

			// why: the result of a workflow reaches no lane the stream carries, so
			// the caller's journal would end with a call nothing ever answered.
			const answered = (yield* journal(receipt.sessionId)).find((row) => row.kind === "tool.completed");
			expect(answered?.payload).toContain(WORKFLOW_CALL);
			expect(answered?.payload).toContain(WORKFLOW_RESULT);
			// why: progress frames are telemetry. The identity in them names the
			// nodes and the rest is dropped, so the counters never reach the log.
			const kept = (yield* journal(receipt.sessionId)).map((row) => row.payload).join("");
			expect(kept).not.toContain("task_progress");
			expect(kept).not.toContain("promptPreview");
		}),
	),
);

it.live("an agent the mirror missed is adopted, and says it was", () =>
	rehearsal((drained) =>
		Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			yield* drained;
			const run = yield* settled(receipt.sessionId);
			const late = run.late;
			if (late === undefined) {
				return;
			}

			// why: the census is the repair source and it says what an agent did,
			// never how the run judged it, so the ending stays unknown rather than
			// being inferred from a transcript that merely stopped.
			// why: a node read back from a stored transcript carries the loss that
			// explains it, and a ledger with anything in it is what incomplete
			// means — the repair recovered the words, not the record of them.
			expect(late).toMatchObject({
				completeness: "incomplete",
				kind: null,
				label: null,
				outcome: "unknown",
				parentSessionId: receipt.sessionId,
				status: "closed",
			});
			expect(yield* kindsOf(late.id)).toEqual(["session.opened", "subsession.gap", "message", "message"]);
			// why: its words already existed when its row was written, and a reader
			// who could not tell would date the work to the moment of the repair.
			const gap = (yield* journal(late.id)).find((row) => row.kind === "subsession.gap");
			expect(gap?.payload).toContain("adopted-late");
		}),
	),
);
