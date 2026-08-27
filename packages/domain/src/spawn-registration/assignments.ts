import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type PrismaError } from "@antumbra/persistence";
import { ensureAgentResourcesUnclaimed } from "@antumbra/resource-reclamation";
import { Effect, Option } from "effect";
import type { SpawnFields } from "#spawn-fields.ts";

export const makeSpawnAssignments = Effect.gen(function* () {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const recoverPieceAssignment = (
		agentId: string,
		pieceId: string,
		failure: PrismaError,
	) =>
		db.PieceAgent.where({ agentId, pieceId })
			.exists()
			.pipe(
				Effect.flatMap((exists) =>
					exists ? Effect.succeed(false) : Effect.fail(failure),
				),
			);
	const storePieceAssignment = (payload: SpawnFields, pieceId: string) =>
		Effect.gen(function* () {
			yield* ensureAgentResourcesUnclaimed(payload.agentId).pipe(
				Effect.provideService(Database, db),
			);
			const existing = yield* db.PieceAgent.where({
				agentId: payload.agentId,
				pieceId,
			}).first();
			if (Option.isSome(existing)) {
				return false;
			}
			return yield* db.PieceAgent.create({
				agentId: payload.agentId,
				pieceId,
			}).pipe(
				Effect.as(true),
				Effect.catchTag("PrismaError", (failure) =>
					recoverPieceAssignment(payload.agentId, pieceId, failure),
				),
			);
		});
	const assignToPiece = (payload: SpawnFields) => {
		const pieceId = payload.pieceId;
		return pieceId === undefined
			? Effect.void
			: storePieceAssignment(payload, pieceId).pipe(
					Effect.tap((created) =>
						created ? feeds.publishVoyageRefresh() : Effect.void,
					),
					Effect.asVoid,
				);
	};
	const recoverVoyageAssignment = (
		agentId: string,
		voyageId: string,
		failure: PrismaError,
	) =>
		db.VoyageAgent.where({ agentId, voyageId })
			.exists()
			.pipe(
				Effect.flatMap((exists) =>
					exists ? Effect.succeed(false) : Effect.fail(failure),
				),
			);
	const storeVoyageAssignment = (payload: SpawnFields, voyageId: string) =>
		Effect.gen(function* () {
			yield* ensureAgentResourcesUnclaimed(payload.agentId).pipe(
				Effect.provideService(Database, db),
			);
			const existing = yield* db.VoyageAgent.where({
				agentId: payload.agentId,
				voyageId,
			}).first();
			if (Option.isSome(existing)) {
				return false;
			}
			return yield* db.VoyageAgent.create({
				agentId: payload.agentId,
				role: payload.role,
				voyageId,
			}).pipe(
				Effect.as(true),
				Effect.catchTag("PrismaError", (failure) =>
					recoverVoyageAssignment(payload.agentId, voyageId, failure),
				),
			);
		});
	const assignToVoyage = (payload: SpawnFields) => {
		const voyageId = payload.voyageId;
		return voyageId === undefined
			? Effect.void
			: storeVoyageAssignment(payload, voyageId).pipe(
					Effect.tap((created) =>
						created ? feeds.publishVoyageRefresh() : Effect.void,
					),
					Effect.asVoid,
				);
	};
	return { assignToPiece, assignToVoyage };
});
