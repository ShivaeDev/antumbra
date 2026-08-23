import { DomainFeeds } from "@antumbra/domain-feeds";
import { type WriteExecutors, Writer } from "@antumbra/persistence";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Context, Effect, Layer, PubSub } from "effect";
import { type JournalAppend, makeJournalAppends } from "#journal-append.ts";
import { makeJournalThroughput } from "#journal-throughput.ts";

export interface JournalWrite<E> {
	readonly appends: ReadonlyArray<JournalAppend>;
	// why: a Session tree's rows and the events that announce them are one fact.
	// The sessionEvent foreign key refuses an event whose Session has no row, so
	// the rows go first and inside the same transaction — either the node exists
	// and its opening is in the log, or neither ever happened.
	readonly rows: Effect.Effect<void, E, WriteExecutors>;
}

export class SessionEventJournal extends Context.Service<
	SessionEventJournal,
	{
		readonly record: (
			sessionId: string,
			event: AgentEvent,
		) => Effect.Effect<boolean>;
		readonly recordTogether: <E>(
			write: JournalWrite<E>,
		) => Effect.Effect<boolean>;
	}
>()("@antumbra/session-event-journal/SessionEventJournal") {}

export const SessionEventJournalLive = Layer.effect(
	SessionEventJournal,
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		const writer = yield* Writer;
		const executors = yield* Effect.context<WriteExecutors>();
		const appendAll = yield* makeJournalAppends;
		const throughput = yield* makeJournalThroughput;
		const appendAndAnnounce = <E>(write: JournalWrite<E>) =>
			Effect.gen(function* () {
				const stored = yield* writer.write(
					Effect.andThen(write.rows, appendAll(write.appends)),
				);
				yield* Effect.forEach(
					stored,
					(row) => PubSub.publish(feeds.events, row),
					{ discard: true },
				);
			});
		const recordTogether = <E>(write: JournalWrite<E>) =>
			throughput.measure(
				write.appends.length,
				appendAndAnnounce(write).pipe(
					Effect.provideContext(executors),
					Effect.as(true),
					// why: one failed append must not end the pump; sequence allocation
					// and insert shared one transaction, so a failure leaves no hidden
					// gap.
					Effect.catchCause((cause) =>
						Effect.logError(
							"event append failed",
							{ sessionIds: write.appends.map((append) => append.sessionId) },
							cause,
						).pipe(Effect.as(false)),
					),
				),
			);
		return {
			record: (sessionId, event) =>
				recordTogether({ appends: [{ event, sessionId }], rows: Effect.void }),
			recordTogether,
		};
	}),
);
