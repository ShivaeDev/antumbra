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
			if (durable !== event.nativeRef) {
				yield* Effect.logWarning("session native identity mismatch", {
					durableNativeRef: durable,
					reportedNativeRef: event.nativeRef,
					sessionId,
				});
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
			// why: the row kind is the neutral event type; the whole neutral event
			// (raw provider payload included) is the row payload.
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
	// why: appends run one after another inside the caller's transaction because
	// two of them can name the same Session, and a sequence read concurrently
	// with its own insert would hand out the same number twice.
	return (appends: ReadonlyArray<JournalAppend>) => Effect.forEach(appends, appendOne, { concurrency: 1 });
});
