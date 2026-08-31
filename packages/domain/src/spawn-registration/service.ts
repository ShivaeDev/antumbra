import { BoardScope, Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect } from "effect";
import { makeSpawnAssignments } from "#spawn-registration/assignments.ts";
import { makeSpawnReservation } from "#spawn-registration/reservation.ts";

export const spawnRegistration = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	const boards = yield* Boards;
	const assignments = yield* makeSpawnAssignments;
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
				yield* assignments.assignToPiece(payload);
				yield* assignments.assignToVoyage(payload);
			}),
	};
});
