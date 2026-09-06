import type { RulingGatedPieceView } from "@antumbra/contract";
import type { StoredVoyage } from "@antumbra/persistence";
import type { MembershipRow, PieceRow } from "#voyage-rows.ts";

export const gatedPiecesSeen = (
	pieces: ReadonlyArray<PieceRow>,
	memberships: ReadonlyArray<MembershipRow>,
	voyages: ReadonlyMap<string, StoredVoyage>,
): ReadonlyArray<RulingGatedPieceView> => {
	if (pieces.length === 0) return [];
	const byPiece = Map.groupBy(memberships, (membership) => membership.pieceId);
	return pieces.flatMap((piece) =>
		(byPiece.get(piece.id) ?? []).flatMap((membership): ReadonlyArray<RulingGatedPieceView> => {
			const voyage = voyages.get(membership.voyageId);
			return voyage === undefined ? [] : [{ pieceId: piece.id, title: piece.title, voyageId: voyage.id, voyageName: voyage.name }];
		}),
	);
};
