import {
	Database,
	type DatabaseService,
	type PrismaError,
	type WriteExecutors,
	Writer,
} from "@antumbra/persistence";
import type { AgentEvent } from "@antumbra/session-events";
import { type Context, Effect, PubSub, Ref } from "effect";
import type { EventSink } from "#fabric.ts";
import type { StoredEvent } from "#feeds.ts";

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
	seq: number,
	event: AgentEvent,
) =>
	Effect.gen(function* () {
		// why: the row kind is the neutral event type; the whole neutral event
		// (raw provider payload included) is the row payload.
		const stored: StoredEvent = {
			kind: event.type,
			payload: JSON.stringify(event),
			seq,
			sessionId,
		};
		yield* context.writer.write(context.db.SessionEvent.create(stored));
		yield* PubSub.publish(context.feed, stored);
	});

// why: the backend's own id arrives as an event, so the row that resume
// reads is written by the same pump that writes the log — no second path.
const recordNativeRef = (
	context: SinkContext,
	sessionId: string,
	event: AgentEvent,
): Effect.Effect<void, PrismaError, WriteExecutors> =>
	event.type === "session.opened"
		? context.writer
				.write(
					context.db.AgentSession.where({ id: sessionId }).update({
						nativeRef: event.nativeRef,
					}),
				)
				.pipe(Effect.asVoid)
		: Effect.void;

const makeSink = (
	context: SinkContext,
	sessionId: string,
	counter: Ref.Ref<number>,
): EventSink => {
	return (event) =>
		Ref.getAndUpdate(counter, (n) => n + 1).pipe(
			Effect.flatMap((seq) =>
				appendAndAnnounce(context, sessionId, seq, event),
			),
			Effect.andThen(recordNativeRef(context, sessionId, event)),
			Effect.provideContext(context.executors),
			// why: one failed append must not end the pump — the gap is logged
			// and the stream continues.
			Effect.catchCause((cause) =>
				Effect.logError("event append failed", { sessionId }, cause),
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
		return (sessionId: string) =>
			Effect.map(Ref.make(0), (counter) =>
				makeSink(context, sessionId, counter),
			);
	});
