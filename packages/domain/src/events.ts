import type { StoredEvent } from "@antumbra/domain-feeds";
import {
	Database,
	type DatabaseService,
	type PrismaError,
	type WriteExecutors,
	Writer,
} from "@antumbra/persistence";
import type { AgentEvent } from "@antumbra/session-events";
import { type Context, Effect, Option, PubSub } from "effect";
import { SessionIdentityMissing } from "#errors.ts";
import type { EventSink } from "#fabric.ts";

interface SinkContext {
	readonly db: DatabaseService;
	readonly executors: Context.Context<WriteExecutors>;
	readonly feed: PubSub.PubSub<StoredEvent>;
	readonly writer: {
		readonly write: <A, E, R>(
			program: Effect.Effect<A, E, R>,
		) => Effect.Effect<A, E | PrismaError, R | WriteExecutors>;
	};
}

const appendAndAnnounce = (
	context: SinkContext,
	sessionId: string,
	event: AgentEvent,
) =>
	Effect.gen(function* () {
		const stored = yield* context.writer.write(
			Effect.gen(function* () {
				const latest = yield* context.db.SessionEvent.where({ sessionId })
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
				yield* context.db.SessionEvent.create(row);
				yield* recordNativeRef(context, sessionId, event);
				return row;
			}),
		);
		yield* PubSub.publish(context.feed, stored);
	});

// why: the backend's own id arrives as an event, so the row that resume
// reads is written by the same pump that writes the log — no second path.
const recordNativeRef = (
	context: SinkContext,
	sessionId: string,
	event: AgentEvent,
): Effect.Effect<void, PrismaError | SessionIdentityMissing, WriteExecutors> =>
	event.type === "session.opened"
		? Effect.gen(function* () {
				const session = yield* context.db.AgentSession.where({
					id: sessionId,
				}).first();
				if (Option.isNone(session)) {
					return yield* new SessionIdentityMissing({ sessionId });
				}
				const durable = session.value.nativeRef;
				if (durable === null) {
					yield* context.db.AgentSession.where({ id: sessionId }).update({
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
			}).pipe(Effect.asVoid)
		: Effect.void;

const makeSink = (context: SinkContext, sessionId: string): EventSink => {
	return (event) =>
		appendAndAnnounce(context, sessionId, event).pipe(
			Effect.provideContext(context.executors),
			Effect.as(true),
			// why: one failed append must not end the pump; sequence allocation and
			// insert shared one transaction, so a failure leaves no hidden gap.
			Effect.catchCause((cause) =>
				Effect.logError("event append failed", { sessionId }, cause).pipe(
					Effect.as(false),
				),
			),
		);
};

// why: the minted sink runs inside intent fibers where R must be never, so
// the factory captures the write lane once.
export const makeEventSinkFactory = (feed: PubSub.PubSub<StoredEvent>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		const executors = yield* Effect.context<WriteExecutors>();
		const context: SinkContext = { db, executors, feed, writer };
		return (sessionId: string) => Effect.succeed(makeSink(context, sessionId));
	});
