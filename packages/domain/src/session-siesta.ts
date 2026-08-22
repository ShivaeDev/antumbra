import { DomainFeeds } from "@antumbra/domain-feeds";
import { defineIntent, IntentExecution } from "@antumbra/kernel";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import {
	decodeSessionExecutionStatus,
	decodeStoredAgentSessionStatus,
	sessionExecutionTransition,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option, PubSub, Schema } from "effect";

const SiestaPayload = Schema.Struct({ sessionId: Schema.String });
export type SiestaFields = typeof SiestaPayload.Type;

export const makeSiestaKind = Effect.gen(function* () {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const fabric = yield* SessionFabric;
	const writer = yield* Writer;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	const announce = Effect.all(
		[
			PubSub.publish(feeds.fleet, undefined),
			PubSub.publish(feeds.voyages, undefined),
		],
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
				provide(
					writer.write(
						db.AgentSession.where({
							id: sessionId,
							executionStatus: "draining",
							status: "open",
						}).update({ executionStatus: next }),
					),
				),
				{ additionalAttempts: 1 },
			);
			yield* execution.step("publish-session-execution", announce);
		});
	// why: a Session that stood down is already idle in the record, and taking
	// its process away does not change what the row says — only whether anything
	// is listening. Nothing is written here, so a restart during the reclaim
	// leaves exactly the truth a restart would have left anyway. The detach
	// declines if words arrived first, and then there is nothing to announce.
	const reclaimIdle = (sessionId: string) =>
		Effect.gen(function* () {
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
			const session = yield* provide(
				db.AgentSession.where({ id: sessionId }).first(),
			);
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
