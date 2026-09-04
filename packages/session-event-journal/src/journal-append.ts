import type { StoredEvent } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option } from "effect";

export interface JournalAppend {
	readonly event: AgentEvent;
	readonly sessionId: string;
}

export const appendJournalEvent = Effect.fn("SessionEventJournal.append")(function* ({ event, sessionId }: JournalAppend) {
	const db = yield* Database;
	const latest = yield* db.SessionEvent.where({ sessionId })
		.orderBy((row) => row.seq.desc())
		.take(1)
		.first();
	const seq = Option.match(latest, {
		onNone: () => 0,
		onSome: (row) => row.seq + 1,
	});
	const row: StoredEvent = {
		kind: event.type,
		payload: JSON.stringify(event),
		seq,
		sessionId,
	};
	yield* db.SessionEvent.create(row);
	if (event.type === "session.opened") {
		yield* db.AgentSession.where({ id: sessionId, nativeRef: null }).update({ nativeRef: event.nativeRef });
	}
	return row;
});
