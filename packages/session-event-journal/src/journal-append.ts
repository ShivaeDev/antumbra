import type { StoredEvent } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Data, Effect, Option } from "effect";

class SessionIdentityMissing extends Data.TaggedError("SessionIdentityMissing")<{
	readonly sessionId: string;
}> {}

export interface JournalAppend {
	readonly event: AgentEvent;
	readonly sessionId: string;
}

export const makeJournalAppends = Effect.gen(function* () {
	const db = yield* Database;
	const recordNativeRef = (sessionId: string, event: AgentEvent) => {
		if (event.type !== "session.opened") {
			return Effect.void;
		}
		return Effect.gen(function* () {
			const session = yield* db.AgentSession.where({ id: sessionId }).first();
			if (Option.isNone(session)) {
				return yield* new SessionIdentityMissing({ sessionId });
			}
			const durable = session.value.nativeRef;
			if (durable === null) {
				yield* db.AgentSession.where({ id: sessionId }).update({
					nativeRef: event.nativeRef,
				});
				return;
			}
		}).pipe(Effect.asVoid);
	};
	const appendOne = ({ event, sessionId }: JournalAppend) =>
		Effect.gen(function* () {
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
			yield* recordNativeRef(sessionId, event);
			return row;
		});
	return (appends: ReadonlyArray<JournalAppend>) => Effect.forEach(appends, appendOne, { concurrency: 1 });
});
