import { pieceStates } from "#piece-state.ts";
import type { DispatchWorld, PieceRow, VoyageRow } from "#voyage-rows.ts";

const MAX_BACKOFF_MILLIS = 5 * 60 * 1000;

export const nextBackoffMillis = (consecutiveFailures: number, patienceMillis: number): number =>
	Math.min(MAX_BACKOFF_MILLIS, patienceMillis * 2 ** Math.max(0, consecutiveFailures));

export interface ReadyPiece {
	readonly piece: PieceRow;
	readonly voyage: VoyageRow;
}

const launchOrder = (left: ReadyPiece, right: ReadyPiece): number => {
	const focus = Number(right.voyage.focusedAt !== null) - Number(left.voyage.focusedAt !== null);
	if (focus !== 0) {
		return focus;
	}
	const launched = (left.piece.launchedAt?.getTime() ?? 0) - (right.piece.launchedAt?.getTime() ?? 0);
	return launched === 0 ? left.piece.id.localeCompare(right.piece.id) : launched;
};

export const readyPieces = (world: DispatchWorld): ReadonlyArray<ReadyPiece> => {
	const states = pieceStates(world);
	const voyages = new Map(world.voyages.map((voyage) => [voyage.id, voyage]));
	const pieces = new Map(world.pieces.map((piece) => [piece.id, piece]));
	const ready = world.memberships.flatMap((membership) => {
		const voyage = voyages.get(membership.voyageId);
		const piece = pieces.get(membership.pieceId);
		if (voyage === undefined || piece === undefined) {
			return [];
		}
		return states.get(piece.id) === "ready" ? [{ piece, voyage }] : [];
	});
	return [...ready].sort(launchOrder);
};
