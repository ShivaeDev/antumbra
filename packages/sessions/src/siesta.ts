import { DomainFeeds } from "@antumbra/domain-feeds";
import { defineIntent, IntentExecution } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import {
	decodeSessionExecutionStatus,
	decodeStoredAgentSessionStatus,
	sessionExecutionTransition,
} from "@antumbra/vocabulary/agent-runtime";
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
	const announce = Effect.all(
		[feeds.publishFleetRefresh(), feeds.publishVoyageRefresh()],
		{ concurrency: 1 },
	).pipe(Effect.asVoid);
	// why: a Session shutdown drained has work to finish before the process may
	// go, so the row says draining until the attachment is actually gone and
	// only then settles.
	const settleDraining = (sessionId: string, from: "draining") =>
		Effect.gen(function* () {
			const execution = yield* IntentExecution;
			yield* execution.step("detach-session", fabric.stop(sessionId));
			const next = yield* Effect.fromResult(
				sessionExecutionTransition(sessionId, from, "settle"),
			);
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
	// why: a Session that stood down is already idle in the record, and taking
	// its process away does not change what the row says — only whether anything
	// is listening. Nothing is written here, so a restart during the reclaim
	// leaves exactly the truth a restart would have left anyway. The detach
	// declines if words arrived first, and then there is nothing to announce.
	// why: the reclaim takes the whole tree's stream away, because only a root is
	// ever attached and its children ride that one acquisition. So a Session with
	// a delegated conversation under way refuses rather than reclaiming: the
	// caller that asked — a button the admiral pressed, or the clock — decided a
	// moment ago, and a child may have started speaking since. The refusal names
	// itself on the Intent so the record says why the rest did not happen, and
	// the demand that asked is re-derived from durable truth on the next pass.
	const reclaimIdle = (sessionId: string) =>
		Effect.gen(function* () {
			if ((yield* live.delegating()).has(sessionId)) {
				return yield* new SessionStillDelegating({ sessionId });
			}
			const execution = yield* IntentExecution;
			yield* execution.step(
				"detach-session",
				Effect.flatMap(fabric.stopIdle(sessionId), (detached) =>
					detached ? announce : Effect.void,
				),
			);
		});
	const settleSiesta = (sessionId: string) =>
		Effect.gen(function* () {
			const session = yield* db.AgentSession.where({ id: sessionId }).first();
			if (Option.isNone(session)) {
				return;
			}
			const status = yield* Effect.fromResult(
				decodeStoredAgentSessionStatus(session.value.id, session.value.status),
			);
			if (status !== "open") {
				return;
			}
			const executionStatus = yield* Effect.fromResult(
				decodeSessionExecutionStatus(sessionId, session.value.executionStatus),
			);
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
