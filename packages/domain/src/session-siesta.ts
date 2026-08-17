import { decodeStoredAgentSessionStatus } from "@antumbra/agent-runtime-vocabulary";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { defineIntent, IntentExecution } from "@antumbra/kernel";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { Effect, Option, PubSub, Schema } from "effect";
import { SessionFabric } from "#fabric.ts";
import {
	decodeSessionExecutionStatus,
	sessionExecutionTransition,
} from "#session-execution-status.ts";

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
			if (executionStatus !== "draining") {
				return;
			}
			const execution = yield* IntentExecution;
			yield* execution.step("detach-session", fabric.stop(sessionId));
			const next = yield* Effect.fromResult(
				sessionExecutionTransition(sessionId, executionStatus, "settle"),
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
	return defineIntent({
		execute: (payload) => settleSiesta(payload.sessionId),
		payload: SiestaPayload,
		reclaim: "requeue",
		tag: "session/siesta",
	});
});
