import type { Option } from "effect";
import { type PieceState, pieceStates } from "#piece-state.ts";
import { type PieceView, pieceView } from "#piece-view.ts";
import type { VoyageDetailRows } from "#voyage/detail/rows.ts";
import { lastStirredAt } from "#voyage-activity.ts";
import { captainOf, type VoyageCaptain } from "#voyage-captain.ts";
import { crewOf, type VoyageCrewMember } from "#voyage-crew.ts";
import type { PieceRow, VoyageRow, VoyageSummaryRows } from "#voyage-rows.ts";
import { piecesOfVoyage, type VoyageState, voyageState } from "#voyage-state.ts";

export type PieceCounts = Readonly<Record<PieceState, number>>;

export interface VoyageView extends VoyageRow {
	readonly captain: Option.Option<VoyageCaptain>;
	readonly counts: PieceCounts;
	readonly crew: ReadonlyArray<VoyageCrewMember>;
	readonly lastStirredAt: Date | null;
	readonly pieces: ReadonlyArray<PieceView>;
	readonly state: VoyageState;
}

export interface VoyageSummary extends VoyageRow {
	readonly captain: Option.Option<VoyageCaptain>;
	readonly counts: PieceCounts;
	readonly lastStirredAt: Date | null;
	readonly state: VoyageState;
}

const memberPieces = (world: VoyageDetailRows, voyageId: string): ReadonlyArray<PieceRow> => {
	const members = new Set(piecesOfVoyage(world, voyageId));
	return world.pieces.filter((piece) => members.has(piece.id));
};

const countStates = (states: ReadonlyArray<PieceState>): PieceCounts => {
	const counts: Record<PieceState, number> = {
		abandoned: 0,
		active: 0,
		blocked: 0,
		done: 0,
		held: 0,
		landing: 0,
		parked: 0,
		ready: 0,
	};
	for (const state of states) counts[state] += 1;
	return counts;
};

export const voyageView = (world: VoyageDetailRows, voyage: VoyageRow): VoyageView => {
	const states = pieceStates(world);
	const pieces = memberPieces(world, voyage.id).map((piece) => pieceView(world, states, piece));
	return {
		...voyage,
		captain: captainOf(world, voyage.id),
		counts: countStates(pieces.map((piece) => piece.state)),
		crew: crewOf(world, voyage.id),
		lastStirredAt: lastStirredAt(world, voyage.id),
		pieces,
		state: voyageState(world, states, voyage.id),
	};
};

export const voyageSummaries = (world: VoyageSummaryRows): ReadonlyArray<VoyageSummary> => {
	const states = pieceStates(world);
	return world.voyages.map((voyage) => ({
		...voyage,
		captain: captainOf(world, voyage.id),
		counts: countStates(
			piecesOfVoyage(world, voyage.id).flatMap((pieceId) => {
				const state = states.get(pieceId);
				return state === undefined ? [] : [state];
			}),
		),
		lastStirredAt: lastStirredAt(world, voyage.id),
		state: voyageState(world, states, voyage.id),
	}));
};
