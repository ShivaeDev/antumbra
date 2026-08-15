import {
	Database,
	Writer,
	type WriteExecutors,
} from "@antumbra/persistence";
import { Effect, Ref } from "effect";
import type { EventSink } from "#fabric.ts";

// why: thinking-token telemetry dominated the spike's event table 74:200 on
// trivial turns — it renders live from the stream and is never persisted.
const DROPPED_KINDS: ReadonlySet<string> = new Set(["system/thinking_tokens"]);

// why: the factory captures the write lane once so the sink it mints is
// context-free — fabric pumps run inside intent fibers where R must be never.
export const makeEventSinkFactory = Effect.gen(function* () {
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
