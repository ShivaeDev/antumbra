import type {
	EventQuery,
	SessionEvent,
	SightFailure,
} from "@antumbra/contract";
import { DomainFeeds, type StoredEvent } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { projectHistoricalAgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Stream } from "effect";
import { toFailure } from "#sight-failure.ts";

export interface SightSessionEvents {
	readonly sessionEventFeed: (
		query: EventQuery,
	) => Stream.Stream<SessionEvent, SightFailure>;
	readonly sessionEvents: (
		query: EventQuery,
	) => Effect.Effect<ReadonlyArray<SessionEvent>, SightFailure>;
}

const pastRehydrated =
	(query: EventQuery, lastSeq: number) => (event: StoredEvent) =>
		event.sessionId === query.sessionId && event.seq > lastSeq;

const projectSessionEvent = (row: StoredEvent): SessionEvent => ({
	event: projectHistoricalAgentEvent(row.kind, row.payload),
	seq: row.seq,
	sessionId: row.sessionId,
});

export const makeSightSessionEvents = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	const db = yield* Database;

	const sessionEvents = (query: EventQuery) =>
		db.SessionEvent.where({ sessionId: query.sessionId })
			.orderBy((event) => event.seq.asc())
			.all()
			.pipe(
				Effect.map((rows) =>
					rows
						.filter((event) => event.seq >= query.fromSeq)
						.map(projectSessionEvent),
				),
				Effect.mapError(toFailure),
			);

	return {
		// why: subscribe before reading the log, then admit only live events past
		// the last rehydrated seq — a notification can be redundant but an event
		// can never be missed or doubled.
		sessionEventFeed: (query) =>
			Stream.unwrap(
				Effect.gen(function* () {
					const subscription = yield* feeds.subscribeSessionEvents();
					const rehydrated = yield* sessionEvents(query);
					const lastSeq = rehydrated.at(-1)?.seq ?? query.fromSeq - 1;
					const live = Stream.fromSubscription(subscription).pipe(
						Stream.filter(pastRehydrated(query, lastSeq)),
						Stream.map(projectSessionEvent),
					);
					return Stream.fromArray(rehydrated).pipe(Stream.concat(live));
				}),
			),
		sessionEvents,
	} satisfies SightSessionEvents;
});
