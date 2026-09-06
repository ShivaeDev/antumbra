import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import { decodeSessionExecutionStatus, decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime.ts";
import { Effect } from "effect";
import { rootSessions } from "#roots.ts";

export const markActive = Effect.fn("SessionDrain.markActive")(function* () {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	const feeds = yield* DomainFeeds;
	const attached = yield* fabric.attached();
	const sessions = yield* db.AgentSession.where(rootSessions)
		.where((session) => session.id.in([...attached]))
		.all();
	const draining: Array<string> = [];
	for (const session of sessions) {
		const status = yield* Effect.fromResult(decodeStoredAgentSessionStatus(session.id, session.status));
		if (status !== "open") {
			continue;
		}
		const executionStatus = yield* Effect.fromResult(decodeSessionExecutionStatus(session.id, session.executionStatus));
		if (executionStatus === "idle") {
			continue;
		}
		draining.push(session.id);
		if (executionStatus === "active") {
			yield* db.AgentSession.where({
				executionStatus: "active",
				id: session.id,
				status: "open",
			}).update({ executionStatus: "draining" });
		}
	}
	if (draining.length > 0) {
		yield* feeds.publishFleetRefresh();
		yield* feeds.publishVoyageRefresh();
	}
	return draining;
});
