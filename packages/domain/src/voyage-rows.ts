import type { ArtifactRow } from "@antumbra/artifacts";
import type { ChangeRow, PieceChangeRow } from "@antumbra/changes";
import type { StoredAgentSession } from "@antumbra/persistence";
import type { EdgeRow, PieceRow, PieceVerdict } from "@antumbra/pieces";
import type { RulingGate } from "@antumbra/rulings";
import type { VoyageAgentSettings } from "@antumbra/settings";
import type { AgentSessionStatus, AgentStatus, SessionExecutionStatus } from "@antumbra/vocabulary/agent-runtime.ts";
import type { VoyageKind } from "@antumbra/vocabulary/voyage.ts";

export type { EdgeRow, PieceRow } from "@antumbra/pieces";

export type AwaitingRuling = Pick<RulingGate, "question" | "rulingId">;

export interface VoyageRow {
	readonly context: string;
	readonly focusedAt: Date | null;
	readonly id: string;
	readonly kind: VoyageKind;
	readonly name: string;
	readonly northStar: string;
}

export interface RepoRow {
	readonly id: string;
	readonly name: string;
}

interface AssignmentRow {
	readonly agentId: string;
	readonly pieceId: string;
}

export interface CrewRow {
	readonly agentId: string;
	readonly role: string;
	readonly voyageId: string;
}

export type AgentSessionRow = Pick<StoredAgentSession, "agentId" | "backend" | "createdAt" | "id"> & {
	readonly executionStatus: SessionExecutionStatus;
	readonly status: AgentSessionStatus;
};

export interface MembershipRow {
	readonly pieceId: string;
	readonly voyageId: string;
}

interface ReportLinkRow {
	readonly pieceId: string;
	readonly reportId: string;
}

export interface RetirementWorld {
	readonly agentStatus: ReadonlyMap<string, AgentStatus>;
	readonly currentSessionByAgent: ReadonlyMap<string, string | null>;
	readonly artifacts: ReadonlyMap<string, ArtifactRow>;
	readonly assignments: ReadonlyArray<AssignmentRow>;
	readonly changes: ReadonlyArray<ChangeRow>;
	readonly dismissedChangeIds: ReadonlySet<string>;
	readonly pieceChanges: ReadonlyArray<PieceChangeRow>;
	readonly pieceReports: ReadonlyArray<ReportLinkRow>;
	readonly pieceVerdicts: ReadonlyMap<string, PieceVerdict>;
	readonly pieces: ReadonlyArray<PieceRow>;
	readonly sessions: ReadonlyArray<AgentSessionRow>;
}

export interface DispatchWorld extends RetirementWorld {
	readonly edges: ReadonlyArray<EdgeRow>;
	readonly memberships: ReadonlyArray<MembershipRow>;
	readonly rulingGates: ReadonlyArray<RulingGate>;
	readonly voyages: ReadonlyArray<VoyageRow>;
}

export interface VoyageSummaryRows extends DispatchWorld {
	readonly crews: ReadonlyArray<CrewRow>;
	readonly roleSettings: ReadonlyMap<string, VoyageAgentSettings>;
}

export type AgentExecutionWorld = Pick<RetirementWorld, "agentStatus" | "currentSessionByAgent" | "sessions">;
