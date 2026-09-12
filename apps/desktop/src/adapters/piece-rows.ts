import type { EdgeRow, PieceRow } from "@antumbra/pieces";
import type { PieceVerdict } from "@antumbra/platform-vocabulary/verdict.ts";

export interface StoredPiece {
	readonly charter: string;
	readonly charteredAt: string;
	readonly expectation: string;
	readonly id: string;
	readonly launchedAt: string | null;
	readonly parkedAt: string | null;
	readonly role: string;
	readonly title: string;
	readonly verdict: PieceVerdict | null;
	readonly voyageId: string;
}

export interface StoredEdge {
	readonly from: string;
	readonly id: string;
	readonly to: string;
}

const stamped = (at: string | null): Date | null => (at === null ? null : new Date(at));

export const pieceOf = (stored: StoredPiece): PieceRow => ({
	charter: stored.charter,
	expectation: stored.expectation,
	id: stored.id,
	launchedAt: stamped(stored.launchedAt),
	parkedAt: stamped(stored.parkedAt),
	role: stored.role,
	title: stored.title,
	verdict: stored.verdict,
	voyageId: stored.voyageId,
});

export const edgeOf = (stored: StoredEdge): EdgeRow => ({ fromPieceId: stored.from, toPieceId: stored.to });

export const verdictsOf = (pieces: ReadonlyArray<PieceRow>, pieceIds: ReadonlyArray<string>): ReadonlyMap<string, PieceVerdict> => {
	const wanted = new Set(pieceIds);
	const landed = new Map<string, PieceVerdict>();
	for (const piece of pieces) {
		if (piece.verdict !== null && wanted.has(piece.id)) {
			landed.set(piece.id, piece.verdict);
		}
	}
	return landed;
};
