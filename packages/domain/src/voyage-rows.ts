import type { ArtifactRow } from "@antumbra/artifacts";
import type { EdgeRow, PieceRow } from "@antumbra/pieces";
import type { ReportRow } from "@antumbra/reports";
import type { ChangeRow, PieceChangeRow } from "#change-rows.ts";
import type { SessionExecutionStatus } from "#session-execution-status.ts";

export type { EdgeRow, PieceRow } from "@antumbra/pieces";

export interface VoyageRow {
	readonly backend: string;
	readonly context: string;
	readonly focusedAt: Date | null;
	readonly id: string;
	readonly name: string;
	readonly northStar: string;
}

// why: a reader of a change wants the repo it lives in by name; the rest of
// the registration is the registry's business, not a view's.
export interface RepoRow {
	readonly id: string;
	readonly name: string;
}

export interface AssignmentRow {
	readonly agentId: string;
	readonly pieceId: string;
}

export interface CrewRow {
	readonly agentId: string;
	readonly role: string;
	readonly voyageId: string;
}

export interface AgentSessionRow {
	readonly agentId: string;
	readonly executionStatus: SessionExecutionStatus;
	readonly id: string;
	readonly status: string;
}

export interface MembershipRow {
	readonly pieceId: string;
	readonly voyageId: string;
}

export interface ReportLinkRow {
	readonly pieceId: string;
	readonly reportId: string;
}

export interface ArtifactLinkRow {
	readonly artifactId: string;
	readonly pieceId: string;
}

// why: the derivation reads whole tables and joins in memory. A voyage's
// state is a function of every row that touches it — a per-voyage query would
// fan out into a read per piece, and these tables stay small by construction.
export interface VoyageWorld {
	readonly agentStatus: ReadonlyMap<string, string>;
	readonly artifacts: ReadonlyMap<string, ArtifactRow>;
	readonly assignments: ReadonlyArray<AssignmentRow>;
	readonly changes: ReadonlyArray<ChangeRow>;
	readonly crews: ReadonlyArray<CrewRow>;
	readonly edges: ReadonlyArray<EdgeRow>;
	readonly memberships: ReadonlyArray<MembershipRow>;
	readonly pieceArtifacts: ReadonlyArray<ArtifactLinkRow>;
	readonly pieceChanges: ReadonlyArray<PieceChangeRow>;
	readonly pieceReports: ReadonlyArray<ReportLinkRow>;
	readonly pieces: ReadonlyArray<PieceRow>;
	readonly reports: ReadonlyMap<string, ReportRow>;
	readonly repos: ReadonlyMap<string, RepoRow>;
	readonly sessions: ReadonlyArray<AgentSessionRow>;
	readonly voyages: ReadonlyArray<VoyageRow>;
}
