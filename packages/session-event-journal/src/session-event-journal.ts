import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Context, Effect, Layer } from "effect";
import { type JournalAppend, makeJournalAppends } from "#journal-append.ts";
import { makeJournalThroughput } from "#journal-throughput.ts";

export interface JournalWrite<E> {
	readonly appends: ReadonlyArray<JournalAppend>;
	// why: a Session tree's rows and the events that announce them are one fact.
	// The sessionEvent foreign key refuses an event whose Session has no row, so
	// the rows go first and inside the same transaction — either the node exists
	// and its opening is in the log, or neither ever happened.
	readonly rows: Effect.Effect<void, E, never>;
}

export class SessionEventJournal extends Context.Service<
	SessionEventJournal,
	{
		readonly record: (sessionId: string, event: AgentEvent) => Effect.Effect<boolean>;
		readonly recordTogether: <E>(write: JournalWrite<E>) => Effect.Effect<boolean>;
	}
>()("@antumbra/session-event-journal/SessionEventJournal") {}

export const SessionEventJournalLive = Layer.effect(
	SessionEventJournal,
	Effect.gen(function* () {
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		const appendAll = yield* makeJournalAppends;
		const throughput = yield* makeJournalThroughput;
		const appendAndAnnounce = <E>(write: JournalWrite<E>) =>
			Effect.gen(function* () {
				const stored = yield* db.transaction(
					Effect.gen(function* () {
						yield* Database;
						yield* write.rows;
						return yield* appendAll(write.appends);
					}),
				);
				yield* Effect.forEach(stored, (row) => feeds.publishSessionEvent(row), {
					discard: true,
				});
			});
		const recordTogether = <E>(write: JournalWrite<E>) =>
			throughput.measure(
				write.appends.length,
				appendAndAnnounce(write).pipe(
					Effect.as(true),
					Effect.catchCause((cause) =>
						Effect.logError("event append failed", { sessionIds: write.appends.map((append) => append.sessionId) }, cause).pipe(Effect.as(false)),
					),
				),
			);
		return {
			record: (sessionId, event) => recordTogether({ appends: [{ event, sessionId }], rows: Effect.void }),
			recordTogether,
		};
	}),
);
