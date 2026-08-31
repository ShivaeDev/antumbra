import { DomainFeeds } from "@antumbra/domain-feeds";
import { defineIntent, IntentExecution } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import { decodeSessionExecutionStatus, decodeStoredAgentSessionStatus, sessionExecutionTransition } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option, Schema } from "effect";
import { SessionStillDelegating } from "#errors.ts";
import { LiveDelegations } from "#tree/live.ts";

const SiestaPayload = Schema.Struct({ sessionId: Schema.String });
export type SiestaFields = typeof SiestaPayload.Type;

export const makeSiestaKind = Effect.gen(function* () {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const fabric = yield* SessionFabric;
	const live = yield* LiveDelegations;
	const announce = Effect.all([feeds.publishFleetRefresh(), feeds.publishVoyageRefresh()], { concurrency: 1 }).pipe(Effect.asVoid);
	// A draining Session settles only after its attachment stops.
	const settleDraining = (sessionId: string, from: "draining") =>
		Effect.gen(function* () {
			const execution = yield* IntentExecution;
			yield* execution.step("detach-session", fabric.stop(sessionId));
			const next = yield* Effect.fromResult(sessionExecutionTransition(sessionId, from, "settle"));
			yield* execution.step(
				"settle-idle",
				db.AgentSession.where({
					id: sessionId,
					executionStatus: "draining",
					status: "open",
				}).update({ executionStatus: next }),
				{ additionalAttempts: 1 },
			);
			yield* execution.step("publish-session-execution", announce);
		});
	// Idle reclamation changes only the disposable attachment; `stopIdle` declines if work arrived after selection.
	// A live child refuses reclamation because the whole tree shares the root attachment.
	const reclaimIdle = (sessionId: string) =>
		Effect.gen(function* () {
			if ((yield* live.delegating()).has(sessionId)) {
				return yield* new SessionStillDelegating({ sessionId });
			}
			const execution = yield* IntentExecution;
			yield* execution.step(
				"detach-session",
				Effect.flatMap(fabric.stopIdle(sessionId), (detached) => (detached ? announce : Effect.void)),
			);
		});
	const settleSiesta = (sessionId: string) =>
		Effect.gen(function* () {
			const session = yield* db.AgentSession.where({ id: sessionId }).first();
			if (Option.isNone(session)) {
				return;
			}
			const status = yield* Effect.fromResult(decodeStoredAgentSessionStatus(session.value.id, session.value.status));
			if (status !== "open") {
				return;
			}
			const executionStatus = yield* Effect.fromResult(decodeSessionExecutionStatus(sessionId, session.value.executionStatus));
			if (executionStatus === "draining") {
				return yield* settleDraining(sessionId, executionStatus);
			}
			if (executionStatus === "idle") {
				return yield* reclaimIdle(sessionId);
			}
		});
	return defineIntent({
		execute: (payload) => settleSiesta(payload.sessionId),
		payload: SiestaPayload,
		reclaim: "requeue",
		tag: "session/siesta",
	});
});
