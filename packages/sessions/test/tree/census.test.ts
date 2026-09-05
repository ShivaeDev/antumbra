import { persistenceIt } from "@antumbra/persistence/testing";
import type { SessionCensus } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { sessionAtRest } from "#at-rest.ts";
import { censusLane, seedAgent, seedSession, treeLayer } from "#test/tree/fixture.ts";
import { LiveDelegations } from "#tree/live.ts";
import { makeSessionTreeSinks } from "#tree/sink.ts";

const it = persistenceIt();

const AGENT = "agent-censused";
const ROOT = "session-root";
const NODE = "session-node";
const CHILD = "thread-child";
const MISSED = "thread-missed";

const raw = { kind: "thread/started", payload: "{}", source: "codex" } as const;

const announced: AgentEvent = {
	raw,
	spawnedBy: CHILD,
	subsessionRef: CHILD,
	type: "subsession.opened",
};

const censusAdmitting: AgentEvent = {
	raw: { kind: "thread/list", payload: '{"id":"missed"}', source: "codex" },
	spawnedBy: MISSED,
	subsessionRef: MISSED,
	type: "subsession.opened",
};

const census = (nodes: SessionCensus["nodes"]): SessionCensus => ({
	events: [],
	nodes,
});

const seedRoot = seedAgent(AGENT).pipe(
	Effect.andThen(
		seedSession({
			agentId: AGENT,
			id: ROOT,
			nativeRef: "native-root",
			rootSessionId: ROOT,
		}),
	),
);

const seedTree = seedRoot.pipe(
	Effect.andThen(
		seedSession({
			agentId: AGENT,
			id: NODE,
			nativeRef: CHILD,
			parentSessionId: ROOT,
			rootSessionId: ROOT,
		}),
	),
);

const restingRoots = Effect.gen(function* () {
	const live = yield* LiveDelegations;
	const delegating = yield* live.delegating();
	return sessionAtRest({ delegating: delegating.has(ROOT), presence: "idle" });
});

const attachedOver = (found: SessionCensus, stream: ReadonlyArray<AgentEvent>) =>
	Effect.gen(function* () {
		const sinkFor = yield* makeSessionTreeSinks;
		const sink = yield* sinkFor(ROOT, censusLane(found));
		yield* Effect.forEach(stream, sink.record, {
			concurrency: 1,
			discard: true,
		});
		yield* sink.attached;
		return yield* restingRoots;
	});

it.effectDB("a census that finds a child idle brings its root to rest", function* () {
	yield* Effect.gen(function* () {
		yield* seedTree;

		const atRest = yield* attachedOver(census([{ nodeRef: CHILD, working: false }]), [announced]);

		// Codex does not emit delegated-thread completion, so an idle census reading ends the delegation.
		expect(atRest).toBe(true);
	}).pipe(Effect.provide(treeLayer));
});

it.effectDB("a census that finds a child working keeps its root from rest", function* () {
	yield* Effect.gen(function* () {
		yield* seedTree;

		const atRest = yield* attachedOver(census([{ nodeRef: CHILD, working: true }]), []);

		// Restart loses in-memory delegations; a working census reading restores them before rest is evaluated.
		expect(atRest).toBe(false);
	}).pipe(Effect.provide(treeLayer));
});

it.effectDB("a child the census both admits and finds working holds one too", function* () {
	yield* Effect.gen(function* () {
		yield* seedRoot;

		const atRest = yield* attachedOver(
			{
				events: [censusAdmitting],
				nodes: [{ nodeRef: MISSED, working: true }],
			},
			[],
		);

		// Census nodes use provider references; newly admitted children must be resolved to Session ids before delegation state is updated.
		expect(atRest).toBe(false);
	}).pipe(Effect.provide(treeLayer));
});

it.effectDB("a census that could not be taken says nothing about rest", function* () {
	yield* Effect.gen(function* () {
		yield* seedTree;

		const atRest = yield* attachedOver(census([]), [announced]);

		expect(atRest).toBe(false);
	}).pipe(Effect.provide(treeLayer));
});
