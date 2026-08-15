import {
	dependenciesOf,
	type PieceState,
	pieceStates,
	piecesOfVoyage,
	type VoyageState,
	voyageState,
} from "#piece-state.ts";
import type {
	ArtifactRow,
	PieceRow,
	ReportRow,
	VoyageRow,
	VoyageWorld,
} from "#voyage-rows.ts";

export interface PieceAgentView {
	readonly agentId: string;
	readonly status: string;
}

export interface PieceView extends PieceRow {
	readonly agents: ReadonlyArray<PieceAgentView>;
	readonly artifacts: ReadonlyArray<ArtifactRow>;
	readonly dependsOn: ReadonlyArray<string>;
	readonly reports: ReadonlyArray<ReportRow>;
	readonly state: PieceState;
}

export type PieceCounts = Readonly<Record<PieceState, number>>;

export interface VoyageView extends VoyageRow {
	readonly pieces: ReadonlyArray<PieceView>;
	readonly state: VoyageState;
}

export interface VoyageSummary extends VoyageRow {
	readonly counts: PieceCounts;
	readonly state: VoyageState;
}

const agentsOf = (
	world: VoyageWorld,
	pieceId: string,
): ReadonlyArray<PieceAgentView> =>
	world.assignments
		.filter((assignment) => assignment.pieceId === pieceId)
		.map((assignment) => ({
			agentId: assignment.agentId,
			status: world.agentStatus.get(assignment.agentId) ?? "unknown",
		}));

const reportsOf = (
	world: VoyageWorld,
	pieceId: string,
): ReadonlyArray<ReportRow> =>
	world.pieceReports
		.filter((link) => link.pieceId === pieceId)
		.flatMap((link) => {
			const report = world.reports.get(link.reportId);
			return report === undefined ? [] : [report];
		});

const artifactsOf = (
	world: VoyageWorld,
	pieceId: string,
): ReadonlyArray<ArtifactRow> =>
	world.pieceArtifacts
		.filter((link) => link.pieceId === pieceId)
		.flatMap((link) => {
			const artifact = world.artifacts.get(link.artifactId);
			return artifact === undefined ? [] : [artifact];
		});

const pieceView = (
	world: VoyageWorld,
	states: ReadonlyMap<string, PieceState>,
	piece: PieceRow,
): PieceView => ({
	...piece,
	agents: agentsOf(world, piece.id),
	artifacts: artifactsOf(world, piece.id),
	dependsOn: dependenciesOf(world.edges, piece.id),
	reports: reportsOf(world, piece.id),
	state: states.get(piece.id) ?? "held",
});

const memberPieces = (
	world: VoyageWorld,
	voyageId: string,
): ReadonlyArray<PieceRow> => {
	const members = new Set(piecesOfVoyage(world, voyageId));
	return world.pieces.filter((piece) => members.has(piece.id));
};

const countStates = (states: ReadonlyArray<PieceState>): PieceCounts => {
	const held = (state: PieceState) =>
		states.filter((candidate) => candidate === state).length;
	return {
		active: held("active"),
		blocked: held("blocked"),
		done: held("done"),
		held: held("held"),
		parked: held("parked"),
		ready: held("ready"),
	};
};

export const voyageView = (
	world: VoyageWorld,
	voyage: VoyageRow,
): VoyageView => {
	const states = pieceStates(world);
	return {
		...voyage,
		pieces: memberPieces(world, voyage.id).map((piece) =>
			pieceView(world, states, piece),
		),
		state: voyageState(world, states, voyage.id),
	};
};

export const voyageSummaries = (
	world: VoyageWorld,
): ReadonlyArray<VoyageSummary> => {
	const states = pieceStates(world);
	return world.voyages.map((voyage) => ({
		...voyage,
		counts: countStates(
			piecesOfVoyage(world, voyage.id).flatMap((pieceId) => {
				const state = states.get(pieceId);
				return state === undefined ? [] : [state];
			}),
		),
		state: voyageState(world, states, voyage.id),
	}));
};
