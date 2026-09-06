import type { EventQuery, SessionEvent, SightFailure } from "@antumbra/contract";
import { DomainFeeds, type StoredEvent } from "@antumbra/domain-feeds";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import { projectHistoricalAgentEvent } from "@antumbra/vocabulary/session-events.ts";
import { Effect, Stream } from "effect";
import { toFailure } from "#sight-failure.ts";

interface SightSessionEvents {
	readonly sessionEventFeed: (query: EventQuery) => Stream.Stream<SessionEvent, SightFailure>;
	readonly sessionEvents: (query: EventQuery) => Effect.Effect<ReadonlyArray<SessionEvent>, SightFailure>;
}

const pastRehydrated = (query: EventQuery, lastSeq: number) => (event: StoredEvent) => event.sessionId === query.sessionId && event.seq > lastSeq;

const projectSessionEvent = (row: StoredEvent): SessionEvent => ({
	event: projectHistoricalAgentEvent(row.kind, row.payload),
	seq: row.seq,
	sessionId: row.sessionId,
});

export const makeSightSessionEvents = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	const journal = yield* SessionEventJournal;

	const sessionEvents = (query: EventQuery) =>
		journal.read(query.sessionId, query.fromSeq).pipe(
			Effect.map((rows) => rows.map(projectSessionEvent)),
			Effect.mapError(toFailure),
		);

	return {
		// Subscribe before rehydrating, then discard live events already covered by the durable sequence.
		sessionEventFeed: (query) =>
			Stream.unwrap(
				Effect.gen(function* () {
					const subscription = yield* feeds.subscribeSessionEvents();
					const rehydrated = yield* sessionEvents(query);
					const lastSeq = rehydrated.at(-1)?.seq ?? query.fromSeq - 1;
					const live = Stream.fromSubscription(subscription).pipe(Stream.filter(pastRehydrated(query, lastSeq)), Stream.map(projectSessionEvent));
					return Stream.fromArray(rehydrated).pipe(Stream.concat(live));
				}),
			),
		sessionEvents,
	} satisfies SightSessionEvents;
});
