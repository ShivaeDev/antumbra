import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { SessionFabric, type SessionTurnMark } from "@antumbra/session-fabric";
import { decodeSessionExecutionStatus, decodeStoredAgentSessionStatus, sessionExecutionTransition } from "@antumbra/vocabulary/agent-runtime";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option, Ref } from "effect";
import { originOf } from "#tree/attribution.ts";

interface SessionTurnRest {
	readonly observed: (event: AgentEvent) => Effect.Effect<void>;
	readonly stranded: Effect.Effect<void>;
}

export const create = Effect.fn("SessionTurnRests.create")(function* (rootSessionId: string, afterRest: Effect.Effect<void, unknown>) {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	const feeds = yield* DomainFeeds;
	const announce = Effect.all([feeds.publishFleetRefresh(), feeds.publishVoyageRefresh()], { concurrency: 1 }).pipe(Effect.asVoid);
	const activeExecution = (sessionId: string) =>
		Effect.gen(function* () {
			const session = yield* db.AgentSession.where({ id: sessionId }).first();
			if (Option.isNone(session)) {
				return undefined;
			}
			const status = yield* Effect.fromResult(decodeStoredAgentSessionStatus(sessionId, session.value.status));
			const execution = yield* Effect.fromResult(decodeSessionExecutionStatus(sessionId, session.value.executionStatus));
			if (status !== "open" || execution !== "active") {
				return undefined;
			}
			return execution;
		});
	const settle = (sessionId: string, mark: SessionTurnMark | undefined) =>
		Effect.gen(function* () {
			const execution = yield* activeExecution(sessionId);
			const next = execution === undefined ? undefined : yield* Effect.fromResult(sessionExecutionTransition(sessionId, execution, "turn-completed"));
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
				yield* afterRest;
			}
		});
	const noticeStranded = (sessionId: string) =>
		Effect.gen(function* () {
			if ((yield* activeExecution(sessionId)) === undefined) {
				return;
			}
			yield* Effect.logWarning("a session stranded when its stream ended", {
				sessionId,
			});
		});
	// A pump's final mark survives detach so it cannot settle a newer attachment.
	const witnessed = yield* Ref.make<SessionTurnMark | undefined>(undefined);
	const remember = (mark: SessionTurnMark | undefined) => (mark === undefined ? Effect.void : Ref.set(witnessed, mark));
	const turned = Effect.gen(function* () {
		const seen = yield* Ref.get(witnessed);
		yield* remember(yield* fabric.turnMark(rootSessionId));
		yield* ended(rootSessionId, seen);
	});
	const observed = (event: AgentEvent) => {
		if (originOf(event) !== undefined) {
			return Effect.void;
		}
		if (event.type !== "turn.completed") {
			return Effect.flatMap(fabric.turnMark(rootSessionId), remember);
		}
		return turned.pipe(Effect.catchCause((cause) => Effect.logError("turn rest failed", { sessionId: rootSessionId }, cause)));
	};
	return {
		observed,
		stranded: noticeStranded(rootSessionId).pipe(
			Effect.catchCause((cause) => Effect.logError("a stranding could not be read", { sessionId: rootSessionId }, cause)),
		),
	} satisfies SessionTurnRest;
});
