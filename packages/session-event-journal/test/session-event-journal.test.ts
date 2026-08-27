import { DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, type NewAgentSession, Writer } from "@antumbra/persistence";
import { acquireTemporaryPersistence } from "@antumbra/persistence/testing";
import {
	SessionEventJournal,
	SessionEventJournalLive,
} from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Option, PubSub } from "effect";

const rawOf = (kind: string): AgentEvent["raw"] => ({
	kind,
	payload: "{}",
	source: "scripted",
});

const journalLayer = SessionEventJournalLive.pipe(
	Layer.provideMerge(DomainFeedsLive),
);

it.live("records unique contiguous per-Session event sequences", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const journal = yield* SessionEventJournal;
				const writer = yield* Writer;
				yield* writer.write(
					db.Agent.create({
						charter: "hold one sequence",
						currentSessionId: "session-sequence",
						id: "agent-sequence",
						role: "test hand",
						status: "alive",
					}),
				);
				yield* writer.write(
					db.AgentSession.create({
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
					} satisfies NewAgentSession),
				);
				yield* writer.write(
					db.SessionEvent.create({
						kind: "message",
						payload: JSON.stringify({
							raw: rawOf("seed"),
							role: "agent",
							text: "seed",
							type: "message",
						}),
						seq: 0,
						sessionId: "session-sequence",
					}),
				);
				yield* Effect.all(
					[
						journal.record("session-sequence", {
							raw: rawOf("first"),
							role: "agent",
							text: "first",
							type: "message",
						}),
						journal.record("session-sequence", {
							raw: rawOf("second"),
							role: "agent",
							text: "second",
							type: "message",
						}),
					],
					{ concurrency: "unbounded" },
				);
				const events = yield* db.SessionEvent.where({
					sessionId: "session-sequence",
				})
					.orderBy((event) => event.seq.asc())
					.all();
				expect(events.map((event) => event.seq)).toEqual([0, 1, 2]);
				expect(events.slice(1).map((event) => event.kind)).toEqual([
					"message",
					"message",
				]);
			}).pipe(
				Effect.provide(journalLayer.pipe(Layer.provideMerge(temporary.layer))),
			);
		}),
	),
);

it.live("does not acknowledge an opening event without a durable Session", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const journal = yield* SessionEventJournal;
				expect(
					yield* journal.record("session-missing", {
						nativeRef: "native-orphan",
						raw: rawOf("session/opened"),
						type: "session.opened",
					}),
				).toBe(false);
				expect(
					yield* db.SessionEvent.where({ sessionId: "session-missing" }).all(),
				).toEqual([]);
			}).pipe(
				Effect.provide(journalLayer.pipe(Layer.provideMerge(temporary.layer))),
			);
		}),
	),
);

it.live("records native identity before publishing the opening event", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			yield* Effect.gen(function* () {
				const db = yield* Database;
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
				const session = yield* db.AgentSession.where({
					id: "session-opening",
				}).first();
				expect(Option.getOrThrow(session).nativeRef).toBe("native-opening");
				expect(published).toMatchObject({
					kind: "session.opened",
					seq: 0,
					sessionId: "session-opening",
				});
			}).pipe(
				Effect.provide(journalLayer.pipe(Layer.provideMerge(temporary.layer))),
			);
		}),
	),
);
