import type { ArtifactRow } from "@antumbra/artifacts";
import type { ChangeRow, PieceChangeRow } from "@antumbra/changes";
import type { StoredAgentSession } from "@antumbra/persistence";
import type { EdgeRow, PieceRow, PieceVerdict } from "@antumbra/pieces";
import type { ReportRow } from "@antumbra/reports";
import type { RulingGate } from "@antumbra/rulings";
import type { AgentSessionStatus, AgentStatus, SessionExecutionStatus } from "@antumbra/vocabulary/agent-runtime";
import type { VoyageKind } from "@antumbra/vocabulary/voyage";

export type { EdgeRow, PieceRow } from "@antumbra/pieces";

export type AwaitingRuling = Pick<RulingGate, "question" | "rulingId">;

export interface VoyageRow {
	readonly captainBackend: string;
	readonly context: string;
	readonly crewBackend: string;
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

export interface VoyageWorld {
	readonly agentStatus: ReadonlyMap<string, AgentStatus>;
	readonly currentSessionByAgent: ReadonlyMap<string, string | null>;
	readonly artifacts: ReadonlyMap<string, ArtifactRow>;
	readonly assignments: ReadonlyArray<AssignmentRow>;
	readonly changes: ReadonlyArray<ChangeRow>;
	readonly crews: ReadonlyArray<CrewRow>;
	readonly dismissedChangeIds: ReadonlySet<string>;
	readonly edges: ReadonlyArray<EdgeRow>;
	readonly memberships: ReadonlyArray<MembershipRow>;
	readonly pieceChanges: ReadonlyArray<PieceChangeRow>;
	readonly pieceReports: ReadonlyArray<ReportLinkRow>;
	readonly pieceVerdicts: ReadonlyMap<string, PieceVerdict>;
	readonly pieces: ReadonlyArray<PieceRow>;
	readonly reports: ReadonlyMap<string, ReportRow>;
	readonly repos: ReadonlyMap<string, RepoRow>;
	readonly rulingGates: ReadonlyArray<RulingGate>;
	readonly sessions: ReadonlyArray<AgentSessionRow>;
	readonly voyages: ReadonlyArray<VoyageRow>;
}
