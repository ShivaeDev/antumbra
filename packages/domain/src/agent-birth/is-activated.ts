import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { storedAgentMatches, storedBerthsMatch, storedResourcesMatch } from "#agent-birth/activated-match.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const isActivated = Effect.fn("AgentBirth.isActivated")(function* (payload: SpawnFields) {
	const db = yield* Database;
	const agent = yield* db.Agent.where({ id: payload.agentId }).first();
	const agentMatches = Option.isSome(agent) ? yield* storedAgentMatches(agent.value, payload) : false;
	const session = yield* db.AgentSession.where({ id: payload.sessionId }).first();
	const moorage = yield* db.Moorage.where({ agentId: payload.agentId }).first();
	const resourcesMatch =
		Option.isSome(session) && Option.isSome(moorage) ? yield* storedResourcesMatch(session.value, moorage.value, payload) : false;
	const berthsMatch = yield* storedBerthsMatch(yield* db.Berth.where({ agentId: payload.agentId }).all(), payload);
	const pieceMatches =
		payload.pieceId === undefined || Option.isSome(yield* db.PieceAgent.where({ agentId: payload.agentId, pieceId: payload.pieceId }).first());
	const voyage =
		payload.voyageId === undefined ? Option.none() : yield* db.VoyageAgent.where({ agentId: payload.agentId, voyageId: payload.voyageId }).first();
	const voyageMatches = payload.voyageId === undefined || (Option.isSome(voyage) && voyage.value.role === payload.role);
	return agentMatches && resourcesMatch && berthsMatch && pieceMatches && voyageMatches;
});
