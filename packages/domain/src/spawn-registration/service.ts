import { BoardScope, Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { ensureAgentCanOwnLocalWork } from "@antumbra/resource-reclamation";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";
import { makeSpawnReservation } from "#spawn-registration/reservation.ts";

export const spawnRegistration = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	const boards = yield* Boards;
	const db = yield* Database;
	const pieces = yield* Pieces;
	const voyages = yield* Voyages;
	const ensureUnclaimed = (agentId: string) => ensureAgentCanOwnLocalWork(agentId).pipe(Effect.provideService(Database, db));
	const reserve = yield* makeSpawnReservation;
	return {
		ensure: (payload: Parameters<typeof reserve>[0]) =>
			Effect.gen(function* () {
				const changed = yield* reserve(payload);
				if (changed) {
					yield* boards.ensure(BoardScope.Agent({ agentId: payload.agentId }));
					yield* feeds.publishFleetRefresh();
					yield* feeds.publishVoyageRefresh();
				}
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
