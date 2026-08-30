import type { RulingGatedPieceView } from "@antumbra/contract";
import type { PieceRow, VoyageWorld } from "#voyage-rows.ts";

const berthedIn = (world: VoyageWorld, piece: PieceRow): ReadonlyArray<RulingGatedPieceView> =>
	world.memberships
		.filter((membership) => membership.pieceId === piece.id)
		.map((membership) => world.voyages.find((row) => row.id === membership.voyageId))
		.filter((voyage) => voyage !== undefined)
		.map((voyage) => ({
			pieceId: piece.id,
			title: piece.title,
			voyageId: voyage.id,
			voyageName: voyage.name,
		}));

// why: a gated piece is named once per voyage it was chartered for, so the
// admiral reads what a ruling releases by the places the work is owed to.
export const gatedPiecesSeen = (world: VoyageWorld, pieceIds: ReadonlyArray<string>): ReadonlyArray<RulingGatedPieceView> =>
	world.pieces.filter((piece) => pieceIds.includes(piece.id)).flatMap((piece) => berthedIn(world, piece));
