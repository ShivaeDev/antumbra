import type { RulingApprovedPieceView } from "@antumbra/contract";
import type { VoyageWorld } from "#voyage-rows.ts";

export const approvedPiecesSeen = (world: VoyageWorld, pieceIds: ReadonlyArray<string>): ReadonlyArray<RulingApprovedPieceView> =>
	pieceIds.flatMap((pieceId) => {
		const piece = world.pieces.find((row) => row.id === pieceId);
		return piece === undefined ? [] : [{ pieceId, title: piece.title }];
	});
