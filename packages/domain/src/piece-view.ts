import type {
	ChangeChecks,
	ChangeMergeable,
	ChangeReview,
	ChangeStage,
} from "@antumbra/plugin-api";
import type { ChangeRow } from "#change-rows.ts";
import { changesOfPiece } from "#outcome-status.ts";
import { dependenciesOf, type PieceState } from "#piece-state.ts";
import type {
	ArtifactRow,
	PieceRow,
	ReportRow,
	VoyageWorld,
} from "#voyage-rows.ts";

export interface PieceAgentView {
	readonly agentId: string;
	readonly status: string;
}

// why: what a reader needs to place a change — where it stands, where it
// lives, and what the host last said about it. The body and the host's raw
// payload stay in the row; nobody reading a piece wants either.
export interface ChangeView {
	readonly checks: ChangeChecks;
	readonly externalId: string | null;
	readonly host: string;
	readonly id: string;
	readonly isDraft: boolean;
	readonly mergeable: ChangeMergeable;
	readonly repoId: string;
	readonly review: ChangeReview;
	readonly stage: ChangeStage;
	readonly title: string;
	readonly url: string | null;
}

export interface PieceView extends PieceRow {
	readonly agents: ReadonlyArray<PieceAgentView>;
	readonly artifacts: ReadonlyArray<ArtifactRow>;
	readonly changes: ReadonlyArray<ChangeView>;
	readonly dependsOn: ReadonlyArray<string>;
	readonly reports: ReadonlyArray<ReportRow>;
	readonly state: PieceState;
}

export const changeView = (change: ChangeRow): ChangeView => ({
	checks: change.checks,
	externalId: change.externalId,
	host: change.host,
	id: change.id,
	isDraft: change.draftAt !== null,
	mergeable: change.mergeable,
	repoId: change.repoId,
	review: change.review,
	stage: change.stage,
	title: change.title,
	url: change.url,
});

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

export const pieceView = (
	world: VoyageWorld,
	states: ReadonlyMap<string, PieceState>,
	piece: PieceRow,
): PieceView => ({
	...piece,
	agents: agentsOf(world, piece.id),
	artifacts: artifactsOf(world, piece.id),
	changes: changesOfPiece(world, piece.id).map(changeView),
	dependsOn: dependenciesOf(world.edges, piece.id),
	reports: reportsOf(world, piece.id),
	state: states.get(piece.id) ?? "held",
});
