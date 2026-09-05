import type { BoardOwnerNotFound, StoredBoardEntryInvalid } from "@antumbra/boards";
import type { RulingReadFailure } from "@antumbra/rulings";
import { Effect } from "effect";
import { charterFor } from "#crew-charter.ts";
import { PieceNotFound } from "#errors.ts";
import { KernelReach, type SpawnRefused } from "#kernel-reach.ts";
import { pieceStates, workingAssignees } from "#piece-state.ts";
import { PieceAbandoned, PieceAlreadyCrewed, PieceNotOnVoyage } from "#piece-work-errors.ts";
import type { VoyageRow, VoyageWorld } from "#voyage-rows.ts";
import type { VoyageWorldReadFailure } from "#voyage-world/read.ts";
import { VoyageWorldSource } from "#voyage-world/service.ts";

export interface CrewedPiece {
	readonly agentId: string;
	readonly intentId: string;
}

export type WorkRefused =
	| BoardOwnerNotFound
	| PieceAbandoned
	| PieceAlreadyCrewed
	| PieceNotFound
	| PieceNotOnVoyage
	| RulingReadFailure
	| SpawnRefused
	| StoredBoardEntryInvalid
	| VoyageWorldReadFailure;

const voyageOf = (world: VoyageWorld, pieceId: string): VoyageRow | undefined => {
	const membership = world.memberships.find((row) => row.pieceId === pieceId);
	return membership === undefined ? undefined : world.voyages.find((row) => row.id === membership.voyageId);
};

export const workPieceNow = (pieceId: string) =>
	Effect.gen(function* () {
		const reach = yield* KernelReach;
		const source = yield* VoyageWorldSource;
		const world = yield* source.read();
		const piece = world.pieces.find((row) => row.id === pieceId);
		if (piece === undefined) {
			return yield* new PieceNotFound({ pieceId });
		}
		if (pieceStates(world).get(pieceId) === "abandoned") {
			return yield* new PieceAbandoned({ pieceId });
		}
		const [working] = workingAssignees(world, pieceId);
		if (working !== undefined) {
			return yield* new PieceAlreadyCrewed({ agentId: working, pieceId });
		}
		const voyage = voyageOf(world, pieceId);
		if (voyage === undefined) {
			return yield* new PieceNotOnVoyage({ pieceId });
		}
		const agentId = crypto.randomUUID();
		const intentId = yield* reach.submitSpawn({
			agentId,
			backend: voyage.crewBackend,
			charter: yield* charterFor(piece, voyage, agentId),
			pieceId,
			role: piece.role,
			runner: "local",
			sessionId: crypto.randomUUID(),
			voyageId: voyage.id,
		});
		return { agentId, intentId };
	});
