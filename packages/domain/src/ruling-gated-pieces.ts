import type { RulingGatedPieceView } from "@antumbra/contract";
import type { StoredVoyage } from "@antumbra/persistence";
import type { PieceRow, VoyageWorld } from "#voyage-rows.ts";

export type GatedPieceRows = Pick<VoyageWorld, "memberships" | "pieces"> & {
	readonly voyages: ReadonlyArray<StoredVoyage>;
};

const berthedIn = (world: GatedPieceRows, piece: PieceRow): ReadonlyArray<RulingGatedPieceView> =>
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

export const gatedPiecesSeen = (world: GatedPieceRows, pieceIds: ReadonlyArray<string>): ReadonlyArray<RulingGatedPieceView> =>
	world.pieces.filter((piece) => pieceIds.includes(piece.id)).flatMap((piece) => berthedIn(world, piece));
