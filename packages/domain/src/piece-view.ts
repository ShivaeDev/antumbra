import type { ArtifactRow } from "@antumbra/artifacts";
import { changesByPiece } from "@antumbra/changes";
import type { ReportRow } from "@antumbra/reports";
import { type ChangeView, changeView, repoNameOf } from "#change-view.ts";
import type { PieceState } from "#piece-state.ts";
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

export const pieceViews = (
	world: VoyageDetailRows,
	states: ReadonlyMap<string, PieceState>,
	pieces: ReadonlyArray<PieceRow>,
): ReadonlyArray<PieceView> => {
	if (pieces.length === 0) return [];
	const assignments = Map.groupBy(world.assignments, (assignment) => assignment.pieceId);
	const reports = Map.groupBy(world.pieceReports, (link) => link.pieceId);
	const artifacts = Map.groupBy(world.artifacts.values(), (artifact) => artifact.pieceId);
	const gates = Map.groupBy(world.rulingGates, (gate) => gate.pieceId);
	const edges = Map.groupBy(world.edges, (edge) => edge.toPieceId);
	const changes = changesByPiece(world);
	return pieces.map((piece) => {
		const heldArtifacts = artifacts.get(piece.id) ?? [];
		return {
			...piece,
			agents: (assignments.get(piece.id) ?? []).map((assignment) => ({
				agentId: assignment.agentId,
				status: world.agentStatus.get(assignment.agentId) ?? "unknown",
			})),
			artifactHistory: heldArtifacts.flatMap((artifact) => {
				const successorArtifactId = artifact.supersededByArtifactId;
				return successorArtifactId === null ? [] : [{ ...artifact, successorArtifactId }];
			}),
			artifacts: heldArtifacts.filter((artifact) => artifact.supersededByArtifactId === null),
			awaitingRulings: (gates.get(piece.id) ?? []).map((gate) => ({ question: gate.question, rulingId: gate.rulingId })),
			changes: (changes.get(piece.id) ?? []).map((change) => changeView(repoNameOf(world, change.repoId), change)),
			dependsOn: (edges.get(piece.id) ?? []).map((edge) => edge.fromPieceId),
			reports: (reports.get(piece.id) ?? []).flatMap((link) => {
				const report = world.reports.get(link.reportId);
				return report === undefined ? [] : [report];
			}),
			state: states.get(piece.id) ?? "held",
		};
	});
};
