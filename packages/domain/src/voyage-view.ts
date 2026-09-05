import { type AgentSettingsChoice, UNCHOSEN_AGENT_SETTINGS } from "@antumbra/settings";
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
	readonly captainSettings: AgentSettingsChoice;
	readonly counts: PieceCounts;
	readonly crewSettings: AgentSettingsChoice;
	readonly crew: ReadonlyArray<VoyageCrewMember>;
	readonly lastStirredAt: Date | null;
	readonly pieces: ReadonlyArray<PieceView>;
	readonly state: VoyageState;
}

export interface VoyageSummary extends VoyageRow {
	readonly captain: Option.Option<VoyageCaptain>;
	readonly captainSettings: AgentSettingsChoice;
	readonly counts: PieceCounts;
	readonly crewSettings: AgentSettingsChoice;
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

export const countsOfVoyage = (
	world: Pick<VoyageSummaryRows, "memberships">,
	states: ReadonlyMap<string, PieceState>,
	voyageId: string,
): PieceCounts =>
	countStates(
		piecesOfVoyage(world, voyageId).flatMap((pieceId) => {
			const state = states.get(pieceId);
			return state === undefined ? [] : [state];
		}),
	);

export const voyageView = (world: VoyageDetailRows, voyage: VoyageRow): VoyageView => {
	const states = pieceStates(world);
	const pieces = memberPieces(world, voyage.id).map((piece) => pieceView(world, states, piece));
	const settings = world.roleSettings.get(voyage.id);
	const captain = captainOf(world, voyage.id);
	const counts = countStates(pieces.map((piece) => piece.state));
	return {
		...voyage,
		captain,
		captainSettings: settings?.captain ?? UNCHOSEN_AGENT_SETTINGS,
		counts,
		crew: crewOf(world, voyage.id),
		crewSettings: settings?.crew ?? UNCHOSEN_AGENT_SETTINGS,
		lastStirredAt: lastStirredAt(world, voyage.id),
		pieces,
		state: voyageState(counts.active, captain),
	};
};

export const voyageSummaries = (world: VoyageSummaryRows): ReadonlyArray<VoyageSummary> => {
	const states = pieceStates(world);
	const memberships = Map.groupBy(world.memberships, (membership) => membership.voyageId);
	const crews = Map.groupBy(world.crews, (crew) => crew.voyageId);
	return world.voyages.map((voyage) => {
		const rows = { ...world, memberships: memberships.get(voyage.id) ?? [], crews: crews.get(voyage.id) ?? [] };
		const captain = captainOf(rows, voyage.id);
		const counts = countsOfVoyage(rows, states, voyage.id);
		const settings = world.roleSettings.get(voyage.id);
		return {
			...voyage,
			captain,
			captainSettings: settings?.captain ?? UNCHOSEN_AGENT_SETTINGS,
			counts,
			crewSettings: settings?.crew ?? UNCHOSEN_AGENT_SETTINGS,
			lastStirredAt: lastStirredAt(rows, voyage.id),
			state: voyageState(counts.active, captain),
		};
	});
};
