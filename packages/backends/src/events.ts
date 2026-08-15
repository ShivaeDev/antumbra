import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { Effect, PubSub, Ref } from "effect";
import type { EventSink } from "#fabric.ts";
import type { StoredEvent } from "#feeds.ts";

// why: thinking-token telemetry outnumbers real events several-fold on even
// trivial turns and renders live from the stream — never persisted.
const DROPPED_KINDS: ReadonlySet<string> = new Set(["system/thinking_tokens"]);

// why: the minted sink runs inside intent fibers where R must be never, so
// the factory captures the write lane once.
export const makeEventSinkFactory = (feed: PubSub.PubSub<StoredEvent>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		const executors = yield* Effect.context<WriteExecutors>();
		return (sessionId: string) =>
			Effect.gen(function* () {
				const seq = yield* Ref.make(0);
				const sink: EventSink = (event) =>
					DROPPED_KINDS.has(event.kind)
						? Effect.void
						: Effect.gen(function* () {
								const next = yield* Ref.getAndUpdate(seq, (n) => n + 1);
								yield* writer.write(
									db.SessionEvent.create({
										kind: event.kind,
										payload: event.payload,
										seq: next,
										sessionId,
									}),
								);
								yield* PubSub.publish(feed, {
									kind: event.kind,
									payload: event.payload,
									seq: next,
									sessionId,
								});
							}).pipe(
								Effect.provideContext(executors),
								// why: one failed append must not end the pump — the gap is
								// logged and the stream continues.
								Effect.catchCause((cause) =>
									Effect.logError("event append failed", { sessionId }, cause),
								),
							);
				return sink;
			});
	});
