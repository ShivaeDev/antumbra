import { DomainFeeds } from "@antumbra/domain-feeds";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Context, Effect, Layer } from "effect";
import { type JournalAppend, makeJournalAppends } from "#journal-append.ts";

interface JournalWrite<E> {
	readonly appends: ReadonlyArray<JournalAppend>;
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
		const feeds = yield* DomainFeeds;
		const appendAll = yield* makeJournalAppends;
		const recordTogether = <E>(write: JournalWrite<E>) =>
			Effect.gen(function* () {
				yield* write.rows;
				const stored = yield* appendAll(write.appends);
				yield* Effect.forEach(stored, (row) => feeds.publishSessionEvent(row), {
					discard: true,
				});
			}).pipe(
				Effect.as(true),
				Effect.catchCause((cause) =>
					Effect.logError("event append failed", { sessionIds: write.appends.map((append) => append.sessionId) }, cause).pipe(Effect.as(false)),
				),
			);
		return {
			record: (sessionId, event) => recordTogether({ appends: [{ event, sessionId }], rows: Effect.void }),
			recordTogether,
		};
	}),
);
