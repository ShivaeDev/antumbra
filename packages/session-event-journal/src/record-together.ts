import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect } from "effect";
import { appendJournalEvent, type JournalAppend } from "#journal-append.ts";

interface JournalWrite {
	readonly appends: ReadonlyArray<JournalAppend>;
	readonly rows: Effect.Effect<void, unknown>;
}

export const recordTogether = Effect.fn("SessionEventJournal.recordTogether")(
	function* (write: JournalWrite) {
		const feeds = yield* DomainFeeds;
		yield* write.rows;
		const stored = yield* Effect.forEach(write.appends, appendJournalEvent, { concurrency: 1 });
		yield* Effect.forEach(stored, (row) => feeds.publishSessionEvent(row), { discard: true });
		return true;
	},
	(effect, write) =>
		effect.pipe(
			Effect.catchCause((cause) =>
				Effect.logError("event append failed", { sessionIds: write.appends.map((append) => append.sessionId) }, cause).pipe(Effect.as(false)),
			),
		),
);
