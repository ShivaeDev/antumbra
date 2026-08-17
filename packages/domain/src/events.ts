import type { StoredEvent } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import type { AgentEvent } from "@antumbra/session-events";
import { Effect, Option, PubSub } from "effect";
import { SessionIdentityMissing } from "#errors.ts";
import type { EventSink } from "#fabric.ts";

// why: the minted sink runs inside intent fibers where R must be never, so
// the factory captures the write lane once.
export const makeEventSinkFactory = (feed: PubSub.PubSub<StoredEvent>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		const executors = yield* Effect.context<WriteExecutors>();

		// why: the backend's own id arrives as an event, so the row that resume
		// reads is written by the same pump that writes the log — no second path.
		const recordNativeRef = (sessionId: string, event: AgentEvent) => {
			if (event.type !== "session.opened") {
				return Effect.void;
			}
			return Effect.gen(function* () {
				const session = yield* db.AgentSession.where({
					id: sessionId,
				}).first();
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

		const appendAndAnnounce = (sessionId: string, event: AgentEvent) =>
			Effect.gen(function* () {
				const stored = yield* writer.write(
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
					}),
				);
				yield* PubSub.publish(feed, stored);
			});

		const makeSink = (sessionId: string): EventSink => {
			return (event) =>
				appendAndAnnounce(sessionId, event).pipe(
					Effect.provideContext(executors),
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

		return (sessionId: string) => Effect.succeed(makeSink(sessionId));
	});
