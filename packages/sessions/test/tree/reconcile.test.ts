import { it } from "@antumbra/persistence/testing";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect } from "@effect/vitest";
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

it.effectDB("a node whose acquisition can never come back is closed", function* () {
	yield* Effect.gen(function* () {
		yield* seedTree("closed");
		const reconcile = yield* makeSessionNodeReconciler;

		yield* reconcile;

		const node = yield* nodeRow;
		expect(node.status).toBe("closed");
		expect(node.outcome).toBe("unknown");
		expect(node.completeness).toBe("incomplete");
		expect((yield* payloadsOn(ROOT)).join("")).toContain("subsession.ended");
		expect((yield* payloadsOn(ROOT)).join("")).toContain("unknown");
		const said = (yield* payloadsOn(NODE)).join("");
		expect(said).toContain("stream-detached");
		expect(said).toContain("the detach that would have said so never ran");
	}).pipe(Effect.provide(treeLayer));
});

it.effectDB("a node whose stream already said it detached is not told twice", function* () {
	yield* Effect.gen(function* () {
		yield* seedTree("closed");
		const journal = yield* SessionEventJournal;
		yield* journal.record(NODE, detached);
		const reconcile = yield* makeSessionNodeReconciler;

		yield* reconcile;

		const said = yield* payloadsOn(NODE);
		expect(said.at(-1)).toContain("unknown");
		expect(said.at(-1)).toContain("how its work ended was never reported");
		expect((yield* nodeRow).outcome).toBe("unknown");
	}).pipe(Effect.provide(treeLayer));
});

it.effectDB("a node whose root is still open is left alone", function* () {
	yield* Effect.gen(function* () {
		yield* seedTree("open");
		const reconcile = yield* makeSessionNodeReconciler;

		yield* reconcile;

		expect((yield* nodeRow).status).toBe("open");
		expect(yield* journalOf(NODE)).toHaveLength(0);
	}).pipe(Effect.provide(treeLayer));
});

it.effectDB("a node whose root a living Agent still holds is left alone", function* () {
	yield* Effect.gen(function* () {
		yield* seedTree("closed");
		yield* pointAgent(AGENT, ROOT);
		const reconcile = yield* makeSessionNodeReconciler;

		yield* reconcile;

		expect((yield* nodeRow).status).toBe("open");
		expect(yield* journalOf(NODE)).toHaveLength(0);
	}).pipe(Effect.provide(treeLayer));
});

it.effectDB("a node of a dormant Agent's closed root is closed", function* () {
	yield* Effect.gen(function* () {
		yield* seedTree("closed", "dormant");
		yield* pointAgent(AGENT, ROOT);
		const reconcile = yield* makeSessionNodeReconciler;

		yield* reconcile;

		expect((yield* nodeRow).status).toBe("closed");
		expect((yield* nodeRow).outcome).toBe("unknown");
	}).pipe(Effect.provide(treeLayer));
});
