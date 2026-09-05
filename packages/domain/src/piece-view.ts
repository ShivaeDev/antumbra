import type { ArtifactRow } from "@antumbra/artifacts";
import { changesOfPiece } from "@antumbra/changes";
import type { ReportRow } from "@antumbra/reports";
import { type ChangeView, changeView, repoNameOf } from "#change-view.ts";
import { awaitingRulingsOf, dependenciesOf, type PieceState } from "#piece-state.ts";
import type { VoyageDetailRows } from "#voyage/detail/rows.ts";
import type { AwaitingRuling, PieceRow } from "#voyage-rows.ts";

export interface PieceAgentView {
	readonly agentId: string;
	readonly status: string;
}

export interface PieceView extends PieceRow {
	readonly agents: ReadonlyArray<PieceAgentView>;
	readonly artifacts: ReadonlyArray<ArtifactRow>;
	readonly awaitingRulings: ReadonlyArray<AwaitingRuling>;
	readonly artifactHistory: ReadonlyArray<ArtifactRow & { readonly successorArtifactId: string }>;
	readonly changes: ReadonlyArray<ChangeView>;
	readonly dependsOn: ReadonlyArray<string>;
	readonly reports: ReadonlyArray<ReportRow>;
	readonly state: PieceState;
}

const agentsOf = (world: VoyageDetailRows, pieceId: string): ReadonlyArray<PieceAgentView> =>
	world.assignments
		.filter((assignment) => assignment.pieceId === pieceId)
		.map((assignment) => ({
			agentId: assignment.agentId,
			status: world.agentStatus.get(assignment.agentId) ?? "unknown",
		}));

const reportsOf = (world: VoyageDetailRows, pieceId: string): ReadonlyArray<ReportRow> =>
	world.pieceReports
		.filter((link) => link.pieceId === pieceId)
		.flatMap((link) => {
			const report = world.reports.get(link.reportId);
			return report === undefined ? [] : [report];
		});

const artifactsOf = (world: VoyageDetailRows, pieceId: string): ReadonlyArray<ArtifactRow> =>
	[...world.artifacts.values()].filter((artifact) => artifact.pieceId === pieceId && artifact.supersededByArtifactId === null);

const artifactHistoryOf = (world: VoyageDetailRows, pieceId: string): ReadonlyArray<ArtifactRow & { readonly successorArtifactId: string }> =>
	[...world.artifacts.values()]
		.filter((artifact) => artifact.pieceId === pieceId)
		.flatMap((artifact) => {
			const successorArtifactId = artifact.supersededByArtifactId;
			return successorArtifactId === null ? [] : [{ ...artifact, successorArtifactId }];
		});

export const pieceView = (world: VoyageDetailRows, states: ReadonlyMap<string, PieceState>, piece: PieceRow): PieceView => ({
	...piece,
	agents: agentsOf(world, piece.id),
	artifactHistory: artifactHistoryOf(world, piece.id),
	artifacts: artifactsOf(world, piece.id),
	awaitingRulings: awaitingRulingsOf(world, piece.id),
	changes: changesOfPiece(world, piece.id).map((change) => changeView(repoNameOf(world, change.repoId), change)),
	dependsOn: dependenciesOf(world.edges, piece.id),
	reports: reportsOf(world, piece.id),
	state: states.get(piece.id) ?? "held",
});
