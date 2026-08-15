import {
	Database,
	type DatabaseService,
	type PrismaError,
	type WriteExecutors,
	Writer,
} from "@antumbra/persistence";
import type { WireEvent } from "@antumbra/plugin-api";
import { type Context, Effect, PubSub, Ref } from "effect";
import type { EventSink } from "#fabric.ts";
import type { StoredEvent } from "#feeds.ts";

// why: thinking-token telemetry outnumbers real events several-fold on even
// trivial turns and renders live from the stream — never persisted.
const DROPPED_KINDS: ReadonlySet<string> = new Set(["system/thinking_tokens"]);

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
	event: WireEvent,
) =>
	Effect.gen(function* () {
		const stored: StoredEvent = {
			kind: event.kind,
			payload: event.payload,
			seq,
			sessionId,
		};
		yield* context.writer.write(context.db.SessionEvent.create(stored));
		yield* PubSub.publish(context.feed, stored);
	});

const makeSink = (
	context: SinkContext,
	sessionId: string,
	counter: Ref.Ref<number>,
): EventSink => {
	return (event) => {
		if (DROPPED_KINDS.has(event.kind)) {
			return Effect.void;
		}
		return Ref.getAndUpdate(counter, (n) => n + 1).pipe(
			Effect.flatMap((seq) =>
				appendAndAnnounce(context, sessionId, seq, event),
			),
			Effect.provideContext(context.executors),
			// why: one failed append must not end the pump — the gap is logged
			// and the stream continues.
			Effect.catchCause((cause) =>
				Effect.logError("event append failed", { sessionId }, cause),
			),
		);
	};
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
