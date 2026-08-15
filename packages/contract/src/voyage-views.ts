import { Schema } from "effect";

export const PieceAgentView = Schema.Struct({
	agentId: Schema.String,
	status: Schema.String,
});
export type PieceAgentView = typeof PieceAgentView.Type;

export const ReportView = Schema.Struct({
	authorAgentId: Schema.NullOr(Schema.String),
	id: Schema.String,
	title: Schema.String,
});
export type ReportView = typeof ReportView.Type;

export const ArtifactView = Schema.Struct({
	authorAgentId: Schema.NullOr(Schema.String),
	id: Schema.String,
	title: Schema.String,
	uri: Schema.String,
});
export type ArtifactView = typeof ArtifactView.Type;

// why: a piece's state is derived from its edges, its stamps and who is at
// work on it — the contract carries the outcome of that ladder so a window
// renders what the domain concluded instead of concluding it again.
export const PieceState = Schema.Literals([
	"active",
	"blocked",
	"done",
	"held",
	"parked",
	"ready",
]);
export type PieceState = typeof PieceState.Type;

export const PieceView = Schema.Struct({
	agents: Schema.Array(PieceAgentView),
	artifacts: Schema.Array(ArtifactView),
	charter: Schema.String,
	dependsOn: Schema.Array(Schema.String),
	expectation: Schema.String,
	id: Schema.String,
	launchedAt: Schema.NullOr(Schema.String),
	parkedAt: Schema.NullOr(Schema.String),
	reports: Schema.Array(ReportView),
	role: Schema.String,
	state: PieceState,
	title: Schema.String,
});
export type PieceView = typeof PieceView.Type;

export const BoardEntryView = Schema.Struct({
	authorAgentId: Schema.NullOr(Schema.String),
	body: Schema.String,
	createdAt: Schema.String,
	id: Schema.String,
	register: Schema.String,
});
export type BoardEntryView = typeof BoardEntryView.Type;

export const VoyageCaptainView = Schema.Struct({
	agentId: Schema.String,
	status: Schema.String,
});
export type VoyageCaptainView = typeof VoyageCaptainView.Type;

export const CrewMemberView = Schema.Struct({
	agentId: Schema.String,
	role: Schema.String,
	status: Schema.String,
});
export type CrewMemberView = typeof CrewMemberView.Type;

export const PieceCounts = Schema.Struct({
	active: Schema.Number,
	done: Schema.Number,
	pieces: Schema.Number,
	ready: Schema.Number,
});
export type PieceCounts = typeof PieceCounts.Type;

// why: a voyage is under way because its captain is at work or a piece of it
// is — never because someone pressed play, so there is no state to set.
export const VoyageState = Schema.Literals(["quiet", "underWay"]);
export type VoyageState = typeof VoyageState.Type;

export const VoyageSummary = Schema.Struct({
	backend: Schema.String,
	captain: Schema.NullOr(VoyageCaptainView),
	counts: PieceCounts,
	focusedAt: Schema.NullOr(Schema.String),
	id: Schema.String,
	name: Schema.String,
	northStar: Schema.String,
	state: VoyageState,
});
export type VoyageSummary = typeof VoyageSummary.Type;

export const VoyageView = Schema.Struct({
	...VoyageSummary.fields,
	board: Schema.Array(BoardEntryView),
	context: Schema.String,
	crew: Schema.Array(CrewMemberView),
	pieces: Schema.Array(PieceView),
});
export type VoyageView = typeof VoyageView.Type;
