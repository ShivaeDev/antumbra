import { bind, standDownSpec } from "@antumbra/agent-tools";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import type { DirectTool } from "@antumbra/plugin-api";
import { SessionFabric } from "@antumbra/session-fabric";
import {
	decodeSessionExecutionStatus,
	decodeStoredAgentSessionStatus,
	sessionExecutionTransition,
} from "@antumbra/vocabulary/agent-runtime";
import { Context, Effect, Layer, Option } from "effect";
import { SessionIdentityMissing } from "#errors.ts";
import { answered } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

const standDown = (identity: SessionIdentity) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const fabric = yield* SessionFabric;
		const feeds = yield* DomainFeeds;
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
					"stand-down",
				),
			);
			yield* writer.write(
				db.AgentSession.where({ id: identity.sessionId }).update({
					executionStatus: next,
				}),
			);
			yield* feeds.publishFleetRefresh();
			yield* feeds.publishVoyageRefresh();
		}
		// why: declaring there is nothing to do is not asking to be put away. The
		// acquisition stays open and listening so the admiral's next words reach
		// an Agent that is already there, and the mark is what lets the system
		// decide later — by the clock, never by the Agent — that the process has
		// been held for nothing long enough to reclaim.
		yield* fabric.standDown(identity.sessionId);
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
		const fabric = yield* SessionFabric;
		const feeds = yield* DomainFeeds;
		const writer = yield* Writer;
		const executors = yield* Effect.context<WriteExecutors>();
		const context = Context.merge(
			executors,
			Context.make(Database, db).pipe(
				Context.add(DomainFeeds, feeds),
				Context.add(SessionFabric, fabric),
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
						() => "standing by",
					),
				),
		});
	}),
);
