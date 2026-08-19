import { DomainFeeds, type StoredEvent } from "@antumbra/domain-feeds";
import {
	Database,
	type PrismaError,
	type WriteExecutors,
	Writer,
} from "@antumbra/persistence";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Context, Data, Effect, Layer, Option, PubSub } from "effect";
import type {
	SessionEventJournalRequirements,
	SessionEventJournalReturn,
} from "#requirements.ts";

class SessionIdentityMissing extends Data.TaggedError(
	"SessionIdentityMissing",
)<{
	readonly sessionId: string;
}> {}

type JournalFailure = PrismaError | SessionIdentityMissing;

export class SessionEventJournal extends Context.Service<
	SessionEventJournal,
	{
		readonly record: (
			sessionId: string,
			event: AgentEvent,
		) => Effect.Effect<boolean>;
	}
>()("@antumbra/session-event-journal/SessionEventJournal") {}

const recordNativeRef = Effect.fn("sessionEventJournal.recordNativeRef")(
	function* (
		sessionId: string,
		event: AgentEvent,
	): SessionEventJournalReturn<void, JournalFailure> {
		if (event.type !== "session.opened") {
			return;
		}
		const db = yield* Database;
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
	},
);

const appendAndAnnounce = Effect.fn("sessionEventJournal.appendAndAnnounce")(
	function* (
		sessionId: string,
		event: AgentEvent,
	): SessionEventJournalReturn<void, JournalFailure> {
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		const writer = yield* Writer;
		const stored = yield* writer.write(
			Effect.gen(function* (): SessionEventJournalReturn<
				StoredEvent,
				JournalFailure
			> {
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
			}),
		);
		yield* PubSub.publish(feeds.events, stored);
	},
);

const record = Effect.fn("sessionEventJournal.record")(function* (
	sessionId: string,
	event: AgentEvent,
): SessionEventJournalReturn<boolean> {
	return yield* appendAndAnnounce(sessionId, event).pipe(
		Effect.as(true),
		// why: one failed append must not end the pump; sequence allocation and
		// insert shared one transaction, so a failure leaves no hidden gap.
		Effect.catchCause((cause) =>
			Effect.logError("event append failed", { sessionId }, cause).pipe(
				Effect.as(false),
			),
		),
	);
});

export const SessionEventJournalLive = Layer.effect(
	SessionEventJournal,
	Effect.gen(function* () {
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		const writer = yield* Writer;
		const executors = yield* Effect.context<WriteExecutors>();
		const context: Context.Context<SessionEventJournalRequirements> =
			Context.merge(
				executors,
				Context.make(Database, db).pipe(
					Context.add(DomainFeeds, feeds),
					Context.add(Writer, writer),
				),
			);
		return {
			record: (sessionId, event) =>
				record(sessionId, event).pipe(Effect.provide(context)),
		};
	}),
);
