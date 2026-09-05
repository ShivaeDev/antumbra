import { BoardScope, Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { reservationFor } from "#agent-birth/current-session.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const reserve = Effect.fn("AgentBirth.reserve")(function* (payload: SpawnFields) {
	const db = yield* Database;
	const boards = yield* Boards;
	const feeds = yield* DomainFeeds;
	const stored = yield* db.Agent.where({ id: payload.agentId }).first();
	if (Option.isSome(stored)) {
		if ((yield* reservationFor(stored.value, payload)) === "current") {
			return;
		}
		const updated = yield* db.Agent.where({ currentSessionId: null, id: payload.agentId, status: "spawning" }).update({
			currentSessionId: payload.sessionId,
		});
		if (updated === null) {
			return;
		}
	} else {
		yield* db.Agent.create({
			charter: payload.charter,
			currentSessionId: payload.sessionId,
			id: payload.agentId,
			role: payload.role,
			status: "spawning",
		});
	}
	yield* boards.ensure(BoardScope.Agent({ agentId: payload.agentId }));
	yield* feeds.publishFleetRefresh();
	yield* feeds.publishVoyageRefresh();
});
