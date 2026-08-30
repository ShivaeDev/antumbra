import { acquireTemporaryPersistence } from "@antumbra/persistence/testing";
import type { SessionCensus } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { sessionAtRest } from "#at-rest.ts";
import {
	censusLane,
	seedAgent,
	seedSession,
	treeLayer,
} from "#test/tree/fixture.ts";
import { LiveDelegations } from "#tree/live.ts";
import { makeSessionTreeSinks } from "#tree/sink.ts";

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

const attachedOver = (
	found: SessionCensus,
	stream: ReadonlyArray<AgentEvent>,
) =>
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

it.live("a census that finds a child idle brings its root to rest", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			yield* seedTree;

			const atRest = yield* attachedOver(
				census([{ nodeRef: CHILD, working: false }]),
				[announced],
			);

			// why: the stream announced this child and codex never says a delegated
			// thread finished, so nothing would ever end the delegation the opening
			// began — the tree would refuse sleep for the rest of its life. A census
			// that reads the child idle is the ending the provider does not send.
			expect(atRest).toBe(true);
		}).pipe(Effect.provide(treeLayer(temporary)));
	}),
);

it.live("a census that finds a child working keeps its root from rest", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			yield* seedTree;

			const atRest = yield* attachedOver(
				census([{ nodeRef: CHILD, working: true }]),
				[],
			);

			// why: a fresh attachment holds no delegations at all, and a restart is
			// exactly that over a tree whose child may still be running. Rest read
			// off an empty registry would take the stream away mid-turn, so the
			// census puts back what the restart could not carry across.
			expect(atRest).toBe(false);
		}).pipe(Effect.provide(treeLayer(temporary)));
	}),
);

it.live("a child the census both admits and finds working holds one too", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			yield* seedRoot;

			const atRest = yield* attachedOver(
				{
					events: [censusAdmitting],
					nodes: [{ nodeRef: MISSED, working: true }],
				},
				[],
			);

			// why: a delegation is held by Session id and a census speaks in the
			// provider's references, so a child that had no row when the reading
			// began has to be looked up after its admission is written — otherwise
			// the one child nothing ever carried is the one rest ignores.
			expect(atRest).toBe(false);
		}).pipe(Effect.provide(treeLayer(temporary)));
	}),
);

it.live("a census that could not be taken says nothing about rest", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			yield* seedTree;

			const atRest = yield* attachedOver(census([]), [announced]);

			// why: an unreadable census lists nobody, and nobody is not everybody at
			// rest. The delegation the stream began stands until something reads the
			// child and finds it done.
			expect(atRest).toBe(false);
		}).pipe(Effect.provide(treeLayer(temporary)));
	}),
);
