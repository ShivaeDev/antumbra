import { Database } from "@antumbra/persistence";
import { acquireTemporaryPersistence } from "@antumbra/persistence/testing";
import { noSessionAudit } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import {
	journalOf,
	seedAgent,
	seedSession,
	sessionRow,
	treeLayer,
} from "#test/tree/fixture.ts";
import { makeSessionTreeSinks } from "#tree/sink.ts";

const AGENT = "agent-redriven";
const ROOT = "session-root";
const NODE = "session-node";
const CHILD = "thread-child";

const raw = { kind: "thread/started", payload: "{}", source: "codex" } as const;

const announced: AgentEvent = {
	raw,
	spawnedBy: CHILD,
	subsessionRef: CHILD,
	type: "subsession.opened",
};

const spoke: AgentEvent = {
	origin: { node: CHILD, spawnedBy: CHILD },
	raw: { kind: "item/completed", payload: "{}", source: "codex" },
	role: "agent",
	text: "still counting",
	type: "message",
};

// why: a life that already knew this child — its row closed and an audit had its
// say — and a restart in which the provider drives it again. The tree in memory
// starts empty, which is exactly the state that would mint a second row.
const seedTree = seedAgent(AGENT).pipe(
	Effect.andThen(
		seedSession({
			agentId: AGENT,
			id: ROOT,
			nativeRef: "native-root",
			rootSessionId: ROOT,
		}),
	),
	Effect.andThen(
		seedSession({
			agentId: AGENT,
			completeness: "incomplete",
			id: NODE,
			nativeRef: CHILD,
			parentSessionId: ROOT,
			rootSessionId: ROOT,
			status: "closed",
		}),
	),
);

const nodeRows = Database.use((db) =>
	db.AgentSession.where({ rootSessionId: ROOT }).all(),
);

const reopened = (event: AgentEvent) =>
	Effect.gen(function* () {
		yield* seedTree;
		const sinkFor = yield* makeSessionTreeSinks;
		const sink = yield* sinkFor(ROOT, noSessionAudit);
		yield* sink.record(event);
		return Option.getOrThrow(yield* sessionRow(NODE));
	});

it.live("a re-driven child that is announced again reopens its row", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const node = yield* reopened(announced);

			// why: resume, from any state, means recording again — whatever an
			// earlier audit concluded is a reading of a life that has resumed.
			expect(node.id).toBe(NODE);
			expect(node.status).toBe("open");
			expect(node.completeness).toBe("recording");
			expect(yield* nodeRows).toHaveLength(2);
			// why: the node opens again in the words the record uses for any Session
			// opening, on its own key, so a reader sees one node resume rather than a
			// second one appearing beside it.
			const said = yield* journalOf(NODE);
			expect(said.map((row) => row.kind)).toEqual(["session.opened"]);
			expect(said[0]?.payload).toContain("session/reopened");
		}).pipe(Effect.provide(treeLayer(temporary)));
	}),
);

it.live("a re-driven child that speaks first reopens its row too", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const node = yield* reopened(spoke);

			// why: codex re-drives a child by sending its words, not by announcing
			// it, so the seam that admits an unannounced node has to ask the record
			// the same question — otherwise one thread's transcript ends up split
			// across two rows.
			expect(node.id).toBe(NODE);
			expect(node.status).toBe("open");
			expect(node.completeness).toBe("recording");
			expect(yield* nodeRows).toHaveLength(2);
			const said = yield* journalOf(NODE);
			expect(said.map((row) => row.kind)).toEqual([
				"session.opened",
				"message",
			]);
			expect(said[1]?.payload).toContain("still counting");
		}).pipe(Effect.provide(treeLayer(temporary)));
	}),
);
