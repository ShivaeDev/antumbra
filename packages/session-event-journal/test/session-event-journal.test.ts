import { DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, type DatabaseService, type NewAgentSession } from "@antumbra/persistence";
import { SessionEventJournal, SessionEventJournalLive } from "@antumbra/session-event-journal";
import { makeEffectApp } from "@antumbra/testing-runtime";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect } from "@effect/vitest";
import { type Context, Effect, Layer, Option, PubSub } from "effect";

const rawOf = (kind: string): AgentEvent["raw"] => ({
	kind,
	payload: "{}",
	source: "scripted",
});

const it = {
	effectApp: makeEffectApp<
		{ readonly db: DatabaseService },
		Context.Service.Identifier<typeof SessionEventJournal> | Context.Service.Identifier<typeof DomainFeeds>
	>(() =>
		Effect.succeed({
			harness: Effect.gen(function* () {
				return { db: yield* Database };
			}),
			layer: SessionEventJournalLive.pipe(Layer.provideMerge(DomainFeedsLive)),
		}),
	),
};

it.effectApp("records events in per-Session order", function* ({ db }) {
	const journal = yield* SessionEventJournal;
	yield* db.Agent.create({
		charter: "hold one sequence",
		currentSessionId: "session-sequence",
		id: "agent-sequence",
		role: "test hand",
		status: "alive",
	});
	yield* db.AgentSession.create({
		agentId: "agent-sequence",
		backend: "scripted",
		charterDeliveredAt: null,
		cwd: "/tmp/agent-sequence",
		executionStatus: "active",
		id: "session-sequence",
		nativeRef: null,
		parentSessionId: null,
		rootSessionId: "session-sequence",
		status: "open",
	} satisfies NewAgentSession);
	expect(
		yield* journal.record("session-sequence", {
			raw: rawOf("first"),
			role: "agent",
			text: "first",
			type: "message",
		}),
	).toBe(true);
	expect(
		yield* journal.record("session-sequence", {
			raw: rawOf("second"),
			role: "agent",
			text: "second",
			type: "message",
		}),
	).toBe(true);
	const events = yield* db.SessionEvent.where({ sessionId: "session-sequence" })
		.orderBy((event) => event.seq.asc())
		.all();
	expect(events.map((event) => event.seq)).toEqual([0, 1]);
	expect(events.map((event) => event.kind)).toEqual(["message", "message"]);
});

it.effectApp("records native identity before publishing the opening event", function* ({ db }) {
	yield* Effect.scoped(
		Effect.gen(function* () {
			const feeds = yield* DomainFeeds;
			const journal = yield* SessionEventJournal;
			const events = yield* feeds.subscribeSessionEvents();
			yield* db.Agent.create({
				charter: "chart the journal",
				currentSessionId: "session-opening",
				id: "agent-opening",
				role: "test hand",
				status: "alive",
			});
			yield* db.AgentSession.create({
				agentId: "agent-opening",
				backend: "scripted",
				charterDeliveredAt: null,
				cwd: "/tmp/agent-opening",
				executionStatus: "active",
				id: "session-opening",
				nativeRef: null,
				parentSessionId: null,
				rootSessionId: "session-opening",
				status: "open",
			} satisfies NewAgentSession);

			expect(
				yield* journal.record("session-opening", {
					nativeRef: "native-opening",
					raw: rawOf("session/opened"),
					type: "session.opened",
				}),
			).toBe(true);
			const published = yield* PubSub.take(events);
			const session = yield* db.AgentSession.where({ id: "session-opening" }).first();
			expect(Option.getOrThrow(session).nativeRef).toBe("native-opening");
			expect(published).toMatchObject({
				kind: "session.opened",
				seq: 0,
				sessionId: "session-opening",
			});
		}),
	);
});

it.effectApp("does not append events when the accompanying write fails", function* ({ db }) {
	const journal = yield* SessionEventJournal;
	const recorded = yield* journal.recordTogether({
		appends: [{ sessionId: "session-failed-write", event: { raw: rawOf("message"), role: "agent", text: "unsaved", type: "message" } }],
		rows: Effect.fail(new Error("write failed")),
	});
	expect(recorded).toBe(false);
	expect(yield* db.SessionEvent.where({ sessionId: "session-failed-write" }).all()).toEqual([]);
});
