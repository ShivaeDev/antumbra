import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { ensureAgentCanOwnLocalWork } from "@antumbra/resource-reclamation";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";
import { AgentBirth } from "#agent-birth/service.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const spawnRegistration = Effect.gen(function* () {
	const db = yield* Database;
	const pieces = yield* Pieces;
	const voyages = yield* Voyages;
	const ensureUnclaimed = (agentId: string) => ensureAgentCanOwnLocalWork(agentId).pipe(Effect.provideService(Database, db));
	const birth = yield* AgentBirth;
	return {
		ensure: (payload: SpawnFields) =>
			Effect.gen(function* () {
				yield* birth.reserve(payload);
				if (payload.pieceId !== undefined) {
					yield* ensureUnclaimed(payload.agentId);
					yield* pieces.assignAgent(payload.pieceId, payload.agentId);
				}
				if (payload.voyageId !== undefined) {
					yield* ensureUnclaimed(payload.agentId);
					yield* voyages.assignAgent(payload.voyageId, payload.agentId, payload.role);
				}
			}),
	};
});
