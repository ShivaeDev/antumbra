import { bind, standDownSpec } from "@antumbra/agent-tools";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import type { DirectTool } from "@antumbra/plugin-api";
import { decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime";
import { Context, Effect, Layer, Option, PubSub } from "effect";
import { SessionIdentityMissing } from "#errors.ts";
import { KernelReach } from "#kernel-reach.ts";
import {
	decodeSessionExecutionStatus,
	sessionExecutionTransition,
} from "#session-execution-status.ts";
import { answered } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

const standDown = (identity: SessionIdentity) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		const reach = yield* KernelReach;
		const writer = yield* Writer;
		const session = yield* db.AgentSession.where({
			id: identity.sessionId,
		}).first();
		if (Option.isNone(session) || session.value.agentId !== identity.agentId) {
			return yield* new SessionIdentityMissing({
				sessionId: identity.sessionId,
			});
		}
		const status = yield* Effect.fromResult(
			decodeStoredAgentSessionStatus(session.value.id, session.value.status),
		);
		if (status !== "open") {
			return yield* new SessionIdentityMissing({
				sessionId: identity.sessionId,
			});
		}
		const executionStatus = yield* Effect.fromResult(
			decodeSessionExecutionStatus(
				identity.sessionId,
				session.value.executionStatus,
			),
		);
		if (executionStatus === "active") {
			const next = yield* Effect.fromResult(
				sessionExecutionTransition(
					identity.sessionId,
					executionStatus,
					"request-siesta",
				),
			);
			yield* writer.write(
				db.AgentSession.where({ id: identity.sessionId }).update({
					executionStatus: next,
				}),
			);
			yield* PubSub.publish(feeds.fleet, undefined);
			yield* PubSub.publish(feeds.voyages, undefined);
		}
		yield* Effect.forkDetach(reach.queueSiesta(identity.sessionId));
	});

export class StandDown extends Context.Service<
	StandDown,
	{
		readonly tool: (identity: SessionIdentity) => DirectTool;
	}
>()("@antumbra/domain/StandDown") {}

export const StandDownLive = Layer.effect(StandDown)(
	Effect.gen(function* () {
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		const reach = yield* KernelReach;
		const writer = yield* Writer;
		const executors = yield* Effect.context<WriteExecutors>();
		const context = Context.merge(
			executors,
			Context.make(Database, db).pipe(
				Context.add(DomainFeeds, feeds),
				Context.add(KernelReach, reach),
				Context.add(Writer, writer),
			),
		);
		return StandDown.of({
			tool: (identity) =>
				bind(standDownSpec, () =>
					answered(
						identity,
						standDownSpec.name,
						Effect.provide(standDown(identity), context),
						() => "standing down",
					),
				),
		});
	}),
);
