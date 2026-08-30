import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { SessionFabric, type SessionTurnMark } from "@antumbra/session-fabric";
import {
	decodeSessionExecutionStatus,
	decodeStoredAgentSessionStatus,
	sessionExecutionTransition,
} from "@antumbra/vocabulary/agent-runtime";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option, Ref } from "effect";
import { makeStrandNotice } from "#strand.ts";
import { originOf } from "#tree/attribution.ts";

export interface SessionTurnRest {
	readonly observed: (event: AgentEvent) => Effect.Effect<void>;
	// why: run when the pump is gone. A row still saying active then is a
	// Session whose work outlived the process doing it.
	readonly stranded: Effect.Effect<void>;
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
	const noticeStranded = yield* makeStrandNotice;
	const announce = Effect.all(
		[feeds.publishFleetRefresh(), feeds.publishVoyageRefresh()],
		{ concurrency: 1 },
	).pipe(Effect.asVoid);
	// why: what the row would become, or nothing when this ending has no row to
	// move — one already rested, one closed, one that was never there.
	const nextRest = (sessionId: string) =>
		Effect.gen(function* () {
			const session = yield* db.AgentSession.where({ id: sessionId }).first();
			if (Option.isNone(session)) {
				return undefined;
			}
			const status = yield* Effect.fromResult(
				decodeStoredAgentSessionStatus(sessionId, session.value.status),
			);
			const execution = yield* Effect.fromResult(
				decodeSessionExecutionStatus(sessionId, session.value.executionStatus),
			);
			if (status !== "open" || execution !== "active") {
				return undefined;
			}
			return yield* Effect.fromResult(
				sessionExecutionTransition(sessionId, execution, "turn-completed"),
			);
		});
	// why: the fabric's verdict is taken immediately before the guarded row move
	// and it is what decides. A newer attachment, or words this ending never
	// heard, keeps the row working; nothing holding the Session at all settles
	// it, because an ending nobody can be racing is nobody's to refuse — that
	// absence used to read as a mismatch and leave the row saying active for the
	// life of the record.
	const settle = (sessionId: string, mark: SessionTurnMark | undefined) =>
		Effect.gen(function* () {
			const next = yield* nextRest(sessionId);
			const ending = yield* fabric.turnEnded(sessionId, mark);
			if (next === undefined || ending === "overtaken") {
				return false;
			}
			const updated = yield* db.AgentSession.where({
				executionStatus: "active",
				id: sessionId,
				status: "open",
			}).update({ executionStatus: next });
			return updated !== null;
		});
	const ended = (sessionId: string, mark: SessionTurnMark | undefined) =>
		Effect.gen(function* () {
			if (yield* settle(sessionId, mark)) {
				yield* announce;
			}
		});
	return (rootSessionId: string) =>
		Effect.gen(function* () {
			// why: the reading as of the last frame this Session produced, kept even
			// after the acquisition it names is gone. Forgetting it would let an
			// ending from a dead pump settle a row a newer attachment has since
			// taken, which is the one thing the reading exists to stop.
			const witnessed = yield* Ref.make<SessionTurnMark | undefined>(undefined);
			const remember = (mark: SessionTurnMark | undefined) =>
				mark === undefined ? Effect.void : Ref.set(witnessed, mark);
			const turned = Effect.gen(function* () {
				const seen = yield* Ref.get(witnessed);
				// why: the ending stands as the last thing seen even when it is
				// refused, so a single overtaken ending is discarded rather than
				// every ending after it.
				yield* remember(yield* fabric.turnMark(rootSessionId));
				yield* ended(rootSessionId, seen);
			});
			const observed = (event: AgentEvent) => {
				// why: a frame carrying attribution is a node's, and a node ending its
				// turn says nothing about whether the root that delegated is done.
				if (originOf(event) !== undefined) {
					return Effect.void;
				}
				if (event.type !== "turn.completed") {
					return Effect.flatMap(fabric.turnMark(rootSessionId), remember);
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
			return {
				observed,
				stranded: noticeStranded(rootSessionId),
			} satisfies SessionTurnRest;
		});
});
