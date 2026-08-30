import type {
	BoardOwnerNotFound,
	StoredBoardEntryInvalid,
	StoredBoardOwnerKindInvalid,
} from "@antumbra/boards";
import type { RulingReadFailure } from "@antumbra/rulings";
import { Effect } from "effect";
import { charterFor } from "#crew-charter.ts";
import { PieceNotFound } from "#errors.ts";
import { KernelReach, type SpawnRefused } from "#kernel-reach.ts";
import { pieceStates, workingAssignees } from "#piece-state.ts";
import {
	PieceAbandoned,
	PieceAlreadyCrewed,
	PieceNotOnVoyage,
} from "#piece-work-errors.ts";
import type { VoyageRow, VoyageWorld } from "#voyage-rows.ts";
import {
	type VoyageWorldReadFailure,
	VoyageWorldSource,
} from "#voyage-world.ts";

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
	| StoredBoardOwnerKindInvalid
	| VoyageWorldReadFailure;

const voyageOf = (
	world: VoyageWorld,
	pieceId: string,
): VoyageRow | undefined => {
	const membership = world.memberships.find((row) => row.pieceId === pieceId);
	return membership === undefined
		? undefined
		: world.voyages.find((row) => row.id === membership.voyageId);
};

// why: the dispatcher pulls only what the ladder calls ready, which is right —
// it is a pool, and a pool that reached past its own rule would spawn against
// blocked and finished work forever. Asking for a piece by name is the admiral
// stepping over that rule once, deliberately, for one piece: it is how a piece
// whose report landed but whose code died with a closed change is run again,
// and how anything the ladder is holding back gets a hand anyway. Nothing here
// widens the pool; the ladder is untouched and this is a separate act.
export const workPieceNow = (pieceId: string) =>
	Effect.gen(function* () {
		const reach = yield* KernelReach;
		const source = yield* VoyageWorldSource;
		const world = yield* source.read;
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
			// why: the sole runner in v1 — the field becomes a choice when a
			// second runner exists to choose between.
			runner: "local",
			sessionId: crypto.randomUUID(),
			voyageId: voyage.id,
		});
		return { agentId, intentId };
	});
