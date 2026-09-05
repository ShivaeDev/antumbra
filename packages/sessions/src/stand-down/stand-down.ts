import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import { decodeSessionExecutionStatus, decodeStoredAgentSessionStatus, sessionExecutionTransition } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";
import { SessionIdentityMissing } from "#errors.ts";
import type { SessionIdentity } from "#recovery/context.ts";

export const standDown = Effect.fn("SessionStandDown.standDown")(function* (identity: SessionIdentity) {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	const feeds = yield* DomainFeeds;
	const session = yield* db.AgentSession.where({
		id: identity.sessionId,
	}).first();
	if (Option.isNone(session) || session.value.agentId !== identity.agentId) {
		return yield* new SessionIdentityMissing({
			sessionId: identity.sessionId,
		});
	}
	const status = yield* Effect.fromResult(decodeStoredAgentSessionStatus(session.value.id, session.value.status));
	if (status !== "open") {
		return yield* new SessionIdentityMissing({
			sessionId: identity.sessionId,
		});
	}
	const executionStatus = yield* Effect.fromResult(decodeSessionExecutionStatus(identity.sessionId, session.value.executionStatus));
	if (executionStatus === "active") {
		const next = yield* Effect.fromResult(sessionExecutionTransition(identity.sessionId, executionStatus, "stand-down"));
		const updated = yield* db.AgentSession.where({
			executionStatus: session.value.executionStatus,
			id: identity.sessionId,
			status: "open",
		}).update({ executionStatus: next });
		if (updated !== null) {
			yield* feeds.publishFleetRefresh();
			yield* feeds.publishVoyageRefresh();
		}
	}
	yield* fabric.standDown(identity.sessionId);
});
