import { Pieces } from "@antumbra/pieces";
import { ensureAgentCanOwnLocalWork } from "@antumbra/resource-reclamation";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";
import { reserve } from "#agent-birth/reserve.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const register = Effect.fn("AgentBirth.register")(function* (payload: SpawnFields) {
	const pieces = yield* Pieces;
	const voyages = yield* Voyages;
	yield* reserve(payload);
	if (payload.pieceId !== undefined) {
		yield* ensureAgentCanOwnLocalWork(payload.agentId);
		yield* pieces.assignAgent(payload.pieceId, payload.agentId);
	}
	if (payload.voyageId !== undefined) {
		yield* ensureAgentCanOwnLocalWork(payload.agentId);
		yield* voyages.assignAgent(payload.voyageId, payload.agentId, payload.role);
	}
});
