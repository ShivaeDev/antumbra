import type { ArtifactRow } from "@antumbra/artifacts";
import type { ChangeRow, PieceChangeRow } from "@antumbra/changes";
import type { StoredAgentSession } from "@antumbra/persistence";
import type { EdgeRow, PieceRow, PieceVerdict } from "@antumbra/pieces";
import type { ReportRow } from "@antumbra/reports";
import type {
	AgentSessionStatus,
	AgentStatus,
	SessionExecutionStatus,
} from "@antumbra/vocabulary/agent-runtime";

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

// why: the structural half is the stored row, so a column change reaches this
// reader as a compile error; the statuses stay decoded words, because a
// projection never passes a raw string on as durable vocabulary.
export type AgentSessionRow = Pick<
	StoredAgentSession,
	"agentId" | "createdAt" | "id"
> & {
	readonly executionStatus: SessionExecutionStatus;
	readonly status: AgentSessionStatus;
};

export interface MembershipRow {
	readonly pieceId: string;
	readonly voyageId: string;
}

export interface ReportLinkRow {
	readonly pieceId: string;
	readonly reportId: string;
}

// why: the derivation reads whole tables and joins in memory. A voyage's
// state is a function of every row that touches it — a per-voyage query would
// fan out into a read per piece, and these tables stay small by construction.
export interface VoyageWorld {
	readonly agentStatus: ReadonlyMap<string, AgentStatus>;
	readonly currentSessionByAgent: ReadonlyMap<string, string | null>;
	readonly artifacts: ReadonlyMap<string, ArtifactRow>;
	readonly assignments: ReadonlyArray<AssignmentRow>;
	readonly changes: ReadonlyArray<ChangeRow>;
	readonly crews: ReadonlyArray<CrewRow>;
	// why: the two verdicts the admiral can land. Both are stored facts the
	// derivations read like any other row — a dismissal settles what a dead
	// change is owed, a piece verdict is an outcome that counts among the landed.
	readonly dismissedChangeIds: ReadonlySet<string>;
	readonly edges: ReadonlyArray<EdgeRow>;
	readonly memberships: ReadonlyArray<MembershipRow>;
	readonly pieceChanges: ReadonlyArray<PieceChangeRow>;
	readonly pieceReports: ReadonlyArray<ReportLinkRow>;
	readonly pieceVerdicts: ReadonlyMap<string, PieceVerdict>;
	readonly pieces: ReadonlyArray<PieceRow>;
	readonly reports: ReadonlyMap<string, ReportRow>;
	readonly repos: ReadonlyMap<string, RepoRow>;
	readonly sessions: ReadonlyArray<AgentSessionRow>;
	readonly voyages: ReadonlyArray<VoyageRow>;
}
