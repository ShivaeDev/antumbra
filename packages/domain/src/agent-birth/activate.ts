import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { activationFor } from "#agent-birth/current-session.ts";
import { AgentNotSpawnable } from "#errors.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const activate = Effect.fn("AgentBirth.activate")(function* (payload: SpawnFields) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const stored = yield* db.Agent.where({ id: payload.agentId }).first();
	if (Option.isNone(stored)) {
		return yield* new AgentNotSpawnable({ agentId: payload.agentId, status: "missing" });
	}
	const next = yield* activationFor(stored.value, payload);
	if (next === null) {
		return;
	}
	const updated = yield* db.Agent.where({
		currentSessionId: payload.sessionId,
		id: payload.agentId,
		status: stored.value.status,
	}).update({ status: next });
	if (updated !== null) {
		yield* feeds.publishFleetRefresh();
	}
});
