import { type PieceRow, Pieces } from "@antumbra/pieces";
import { Effect } from "effect";
import type { EdgeRow, MembershipRow } from "#voyage-rows.ts";

export const membershipsOf = (pieces: ReadonlyArray<PieceRow>): ReadonlyArray<MembershipRow> => {
	const berths: MembershipRow[] = [];
	for (const piece of pieces) {
		berths.push({ pieceId: piece.id, voyageId: piece.voyageId });
	}
	return berths;
};

export const piecesByIds = Effect.fnUntraced(function* (pieceIds: ReadonlyArray<string>) {
	const pieces = yield* Pieces;
	const wanted = new Set(pieceIds);
	const found: PieceRow[] = [];
	for (const piece of yield* pieces.list()) {
		if (wanted.has(piece.id)) {
			found.push(piece);
		}
	}
	return found;
});

export const piecesOfVoyages = Effect.fnUntraced(function* (voyageIds: ReadonlyArray<string>) {
	const pieces = yield* Pieces;
	const wanted = new Set(voyageIds);
	const berthed: PieceRow[] = [];
	for (const piece of yield* pieces.list()) {
		if (wanted.has(piece.voyageId)) {
			berthed.push(piece);
		}
	}
	return berthed;
});

export const edgesOfVoyages = Effect.fnUntraced(function* (voyageIds: ReadonlySet<string>) {
	const pieces = yield* Pieces;
	const wired: EdgeRow[] = [];
	for (const voyageId of voyageIds) {
		for (const edge of yield* pieces.edges(voyageId)) {
			wired.push(edge);
		}
	}
	return wired;
});
