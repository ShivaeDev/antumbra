import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { ensureAgentCanOwnLocalWork } from "@antumbra/resource-reclamation";
import { Effect, Option } from "effect";
import type { SpawnFields } from "#spawn-fields.ts";

export const makeSpawnAssignments = Effect.gen(function* () {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const ensureUnclaimed = (agentId: string) => ensureAgentCanOwnLocalWork(agentId).pipe(Effect.provideService(Database, db));
	const storePieceAssignment = (payload: SpawnFields, pieceId: string) =>
		Effect.gen(function* () {
			yield* ensureUnclaimed(payload.agentId);
			const existing = yield* db.PieceAgent.where({
				agentId: payload.agentId,
				pieceId,
			}).first();
			if (Option.isSome(existing)) {
				return false;
			}
			yield* db.PieceAgent.create({
				agentId: payload.agentId,
				pieceId,
			});
			return true;
		});
	const assignToPiece = (payload: SpawnFields) => {
		const pieceId = payload.pieceId;
		return pieceId === undefined
			? Effect.void
			: storePieceAssignment(payload, pieceId).pipe(
					Effect.tap((created) => (created ? feeds.publishVoyageRefresh() : Effect.void)),
					Effect.asVoid,
				);
	};
	const storeVoyageAssignment = (payload: SpawnFields, voyageId: string) =>
		Effect.gen(function* () {
			yield* ensureUnclaimed(payload.agentId);
			const existing = yield* db.VoyageAgent.where({
				agentId: payload.agentId,
				voyageId,
			}).first();
			if (Option.isSome(existing)) {
				return false;
			}
			yield* db.VoyageAgent.create({
				agentId: payload.agentId,
				role: payload.role,
				voyageId,
			});
			return true;
		});
	const assignToVoyage = (payload: SpawnFields) => {
		const voyageId = payload.voyageId;
		return voyageId === undefined
			? Effect.void
			: storeVoyageAssignment(payload, voyageId).pipe(
					Effect.tap((created) => (created ? feeds.publishVoyageRefresh() : Effect.void)),
					Effect.asVoid,
				);
	};
	return { assignToPiece, assignToVoyage };
});
