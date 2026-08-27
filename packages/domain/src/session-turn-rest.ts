import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import {
	decodeSessionExecutionStatus,
	decodeStoredAgentSessionStatus,
	sessionExecutionTransition,
} from "@antumbra/vocabulary/agent-runtime";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option, Ref } from "effect";
import { originOf } from "#session-tree-attribution.ts";

export interface SessionTurnRest {
	readonly observed: (event: AgentEvent) => Effect.Effect<void>;
}

// why: an Agent that ends its turn without declaring anything has still
// stopped, and a record that only hears declarations leaves it working
// forever. The ending settles the execution and leaves the same quiet mark a
// stand-down leaves, so the clock has one mark to read — and the two acts stay
// separate in the log, because a turn ending is never rewritten as a
// declaration nobody made.
export const makeSessionTurnRests = Effect.gen(function* () {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	const feeds = yield* DomainFeeds;
	const writer = yield* Writer;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	const announce = Effect.all(
		[feeds.publishFleetRefresh(), feeds.publishVoyageRefresh()],
		{ concurrency: 1 },
	).pipe(Effect.asVoid);
	const settle = (sessionId: string, stirrings: number) =>
		Effect.gen(function* () {
			const session = yield* db.AgentSession.where({ id: sessionId }).first();
			if (Option.isNone(session)) {
				return false;
			}
			const status = yield* Effect.fromResult(
				decodeStoredAgentSessionStatus(sessionId, session.value.status),
			);
			const execution = yield* Effect.fromResult(
				decodeSessionExecutionStatus(sessionId, session.value.executionStatus),
			);
			if (status !== "open" || execution !== "active") {
				return false;
			}
			const next = yield* Effect.fromResult(
				sessionExecutionTransition(sessionId, execution, "turn-completed"),
			);
			// why: the count is taken again with the write permit already held, so
			// words arriving from here on cannot reach the row before this does.
			// They wait for the permit, find the Session idle, and wake it — which
			// is what keeps a genuinely re-activated Session working.
			if ((yield* fabric.stirrings(sessionId)) !== stirrings) {
				return false;
			}
			yield* db.AgentSession.where({
				executionStatus: "active",
				id: sessionId,
				status: "open",
			}).update({ executionStatus: next });
			return true;
		});
	// why: the mark is left whether or not the row moved — a Session already
	// idle is untouched by a further ending, and the mark it already carries
	// keeps the moment its quiet began rather than restarting the hour.
	const ended = (sessionId: string, stirrings: number) =>
		Effect.gen(function* () {
			const moved = yield* provide(writer.write(settle(sessionId, stirrings)));
			yield* fabric.turnEnded(sessionId, stirrings);
			if (moved) {
				yield* announce;
			}
		});
	return (rootSessionId: string) =>
		Effect.gen(function* () {
			const taken = yield* fabric.stirrings(rootSessionId);
			// why: the count of words as of the last frame this Session produced. An
			// ending is only news while nothing has been said since the Session was
			// last seen working — one that arrives after words did belongs to a turn
			// the next words have already replaced, and settling on it would put a
			// Session that is working back to rest.
			const witnessed = yield* Ref.make(taken);
			const turned = Effect.gen(function* () {
				const stirrings = yield* fabric.stirrings(rootSessionId);
				// why: the ending stands as the last thing seen even when it is
				// refused, so a single overtaken ending is discarded rather than
				// every ending after it.
				const seen = yield* Ref.getAndSet(witnessed, stirrings);
				if (stirrings !== seen) {
					return;
				}
				yield* ended(rootSessionId, stirrings);
			});
			const observed = (event: AgentEvent) => {
				// why: a frame carrying attribution is a node's, and a node ending its
				// turn says nothing about whether the root that delegated is done.
				if (originOf(event) !== undefined) {
					return Effect.void;
				}
				if (event.type !== "turn.completed") {
					return Effect.flatMap(fabric.stirrings(rootSessionId), (stirrings) =>
						Ref.set(witnessed, stirrings),
					);
				}
				return turned.pipe(
					// why: a lifecycle this Session's words never asked for must not be
					// what ends its stream, so a failure is reported and the pump goes
					// on. The next ending settles what this one could not.
					Effect.catchCause((cause) =>
						Effect.logError(
							"turn rest failed",
							{ sessionId: rootSessionId },
							cause,
						),
					),
				);
			};
			return { observed } satisfies SessionTurnRest;
		});
});
