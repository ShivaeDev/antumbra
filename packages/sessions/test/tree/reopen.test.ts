import { Database } from "@antumbra/persistence";
import { noSessionAudit } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { journalOf, seedAgent, seedSession, sessionRow, treeTest } from "#test/tree/fixture.ts";
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

// A restarted tree has no in-memory child identity, but persisted provider references must reopen the existing row.
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

const nodeRows = Database.use((db) => db.AgentSession.where({ rootSessionId: ROOT }).all());

const reopened = (event: AgentEvent) =>
	Effect.gen(function* () {
		yield* seedTree;
		const sinkFor = yield* makeSessionTreeSinks;
		const sink = yield* sinkFor(ROOT, noSessionAudit);
		yield* sink.record(event);
		return Option.getOrThrow(yield* sessionRow(NODE));
	});

it.live("a re-driven child that is announced again reopens its row", () =>
	treeTest(
		Effect.gen(function* () {
			const node = yield* reopened(announced);

			expect(node.status).toBe("open");
			expect(node.completeness).toBe("recording");
			expect(yield* nodeRows).toHaveLength(2);
			const said = yield* journalOf(NODE);
			expect(said.map((row) => row.kind)).toEqual(["session.opened"]);
			expect(said[0]?.payload).toContain("session/reopened");
		}),
	),
);

it.live("a re-driven child that speaks first reopens its row too", () =>
	treeTest(
		Effect.gen(function* () {
			const node = yield* reopened(spoke);

			// Codex may resume a child with a message before another opening announcement.
			expect(node.status).toBe("open");
			expect(node.completeness).toBe("recording");
			expect(yield* nodeRows).toHaveLength(2);
			const said = yield* journalOf(NODE);
			expect(said.map((row) => row.kind)).toEqual(["session.opened", "message"]);
			expect(said[1]?.payload).toContain("still counting");
		}),
	),
);
