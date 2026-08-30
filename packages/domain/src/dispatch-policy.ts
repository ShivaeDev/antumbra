import { pieceStates } from "#piece-state.ts";
import type { PieceRow, VoyageRow, VoyageWorld } from "#voyage-rows.ts";

const MAX_BACKOFF_MILLIS = 5 * 60 * 1000;

// why: a piece whose spawn keeps failing must not burn the pool on every
// tick, and the ceiling keeps a permanently broken piece from disappearing
// for hours. Doubling from the patience floor is the whole policy — one pure
// function, so the numbers can be argued about without touching the loop.
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

// why: pools pull, so the dispatcher never asks a piece to wait its turn in a
// stored queue — it re-reads which pieces are ready and orders them by the
// admiral's focus, then by how long they have been released.
export const readyPieces = (world: VoyageWorld): ReadonlyArray<ReadyPiece> => {
	const states = pieceStates(world);
	const voyages = new Map(world.voyages.map((voyage) => [voyage.id, voyage]));
	const ready = world.memberships.flatMap((membership) => {
		const voyage = voyages.get(membership.voyageId);
		const piece = world.pieces.find((row) => row.id === membership.pieceId);
		if (voyage === undefined || piece === undefined) {
			return [];
		}
		return states.get(piece.id) === "ready" ? [{ piece, voyage }] : [];
	});
	return [...ready].sort(launchOrder);
};
