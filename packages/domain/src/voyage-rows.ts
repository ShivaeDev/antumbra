export interface VoyageRow {
	readonly backend: string;
	readonly context: string;
	readonly focusedAt: Date | null;
	readonly id: string;
	readonly name: string;
	readonly northStar: string;
}

export interface PieceRow {
	readonly charter: string;
	readonly expectation: string;
	readonly id: string;
	readonly launchedAt: Date | null;
	readonly parkedAt: Date | null;
	readonly role: string;
	readonly title: string;
}

export interface ReportRow {
	readonly authorAgentId: string | null;
	readonly body: string;
	readonly id: string;
	readonly title: string;
}

export interface ArtifactRow {
	readonly authorAgentId: string | null;
	readonly id: string;
	readonly title: string;
	readonly uri: string;
}

export interface EdgeRow {
	readonly fromPieceId: string;
	readonly toPieceId: string;
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
	readonly crews: ReadonlyArray<CrewRow>;
	readonly edges: ReadonlyArray<EdgeRow>;
	readonly memberships: ReadonlyArray<MembershipRow>;
	readonly pieceArtifacts: ReadonlyArray<ArtifactLinkRow>;
	readonly pieceReports: ReadonlyArray<ReportLinkRow>;
	readonly pieces: ReadonlyArray<PieceRow>;
	readonly reports: ReadonlyMap<string, ReportRow>;
	readonly voyages: ReadonlyArray<VoyageRow>;
}
