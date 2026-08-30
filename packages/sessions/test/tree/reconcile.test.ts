import { acquireTemporaryPersistence } from "@antumbra/persistence/testing";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { journalOf, pointAgent, seedAgent, seedSession, sessionRow, treeLayer } from "#test/tree/fixture.ts";
import { makeSessionNodeReconciler } from "#tree/reconcile.ts";

const AGENT = "agent-reconciled";
const ROOT = "session-root";
const NODE = "session-node";

const detached: AgentEvent = {
	detail: "the stream carrying this node detached before it said anything",
	gapKind: "stream-detached",
	raw: { kind: "session/detached", payload: "{}", source: "scripted" },
	type: "subsession.gap",
};

// why: a life that ended without anyone closing the node — the row is open, the
// root it hung from is whatever the rehearsal says, and the reconciler is the
// first thing to look at either since the restart.
const seedTree = (rootStatus: string, agentStatus = "alive") =>
	seedAgent(AGENT, agentStatus).pipe(
		Effect.andThen(
			seedSession({
				agentId: AGENT,
				id: ROOT,
				nativeRef: "native-root",
				rootSessionId: ROOT,
				status: rootStatus,
			}),
		),
		Effect.andThen(
			seedSession({
				agentId: AGENT,
				id: NODE,
				nativeRef: "native-node",
				parentSessionId: ROOT,
				rootSessionId: ROOT,
			}),
		),
	);

const nodeRow = sessionRow(NODE).pipe(Effect.map(Option.getOrThrow));

const payloadsOn = (sessionId: string) => journalOf(sessionId).pipe(Effect.map((rows) => rows.map((row) => `${row.kind} ${row.payload}`)));

it.live("a node whose acquisition can never come back is closed", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			yield* seedTree("closed");
			const reconcile = yield* makeSessionNodeReconciler;

			yield* reconcile;

			// why: the outcome is unknown and nothing else. A node the record stopped
			// hearing from may have finished, failed or been killed, and absence is
			// not completion — the one honest thing to say is that it never found out.
			const node = yield* nodeRow;
			expect(node.status).toBe("closed");
			expect(node.outcome).toBe("unknown");
			expect(node.completeness).toBe("incomplete");
			// why: the ending is a fact about the turn that spawned the node, so it
			// lands in the spawner's journal; the loss that explains it lands on the
			// node's own key. Both in one transaction with the row that closed.
			expect((yield* payloadsOn(ROOT)).join("")).toContain("subsession.ended");
			expect((yield* payloadsOn(ROOT)).join("")).toContain("unknown");
			const said = (yield* payloadsOn(NODE)).join("");
			expect(said).toContain("stream-detached");
			expect(said).toContain("the detach that would have said so never ran");
		}).pipe(Effect.provide(treeLayer(temporary)));
	}),
);

it.live("a node whose stream already said it detached is not told twice", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			yield* seedTree("closed");
			const journal = yield* SessionEventJournal;
			yield* journal.record(NODE, detached);
			const reconcile = yield* makeSessionNodeReconciler;

			yield* reconcile;

			// why: the detach hook did fire, so what is missing now is not the
			// stream — it is the ending nobody ever reported. That loss has no name
			// of its own and takes the escape hatch rather than a neighbour's word.
			const said = yield* payloadsOn(NODE);
			expect(said.at(-1)).toContain("unknown");
			expect(said.at(-1)).toContain("how its work ended was never reported");
			expect((yield* nodeRow).outcome).toBe("unknown");
		}).pipe(Effect.provide(treeLayer(temporary)));
	}),
);

it.live("a node whose root is still open is left alone", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			yield* seedTree("open");
			const reconcile = yield* makeSessionNodeReconciler;

			yield* reconcile;

			// why: backgrounded work outlives the turn that started it and a codex
			// child is re-driven across activations, so silence is never death. A
			// root that can still carry a stream leaves its nodes undecidable.
			expect((yield* nodeRow).status).toBe("open");
			expect(yield* journalOf(NODE)).toHaveLength(0);
		}).pipe(Effect.provide(treeLayer(temporary)));
	}),
);

it.live("a node whose root a living Agent still holds is left alone", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			yield* seedTree("closed");
			yield* pointAgent(AGENT, ROOT);
			const reconcile = yield* makeSessionNodeReconciler;

			yield* reconcile;

			// why: a closed root that is the current Session of a living Agent is
			// exactly what recovery resumes, and the resumed stream can re-drive the
			// children this would otherwise have buried.
			expect((yield* nodeRow).status).toBe("open");
			expect(yield* journalOf(NODE)).toHaveLength(0);
		}).pipe(Effect.provide(treeLayer(temporary)));
	}),
);

it.live("a node of a dormant Agent's closed root is closed", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			yield* seedTree("closed", "dormant");
			yield* pointAgent(AGENT, ROOT);
			const reconcile = yield* makeSessionNodeReconciler;

			yield* reconcile;

			// why: a dormant Agent takes no more work, so the Session it holds will
			// never be resumed and the node hanging from it has nothing left that
			// could speak for it.
			expect((yield* nodeRow).status).toBe("closed");
			expect((yield* nodeRow).outcome).toBe("unknown");
		}).pipe(Effect.provide(treeLayer(temporary)));
	}),
);
