import { BoardRegisterSchema } from "@antumbra/vocabulary/board";
import { VoyageKindSchema } from "@antumbra/vocabulary/voyage";
import { Schema } from "effect";
import { ArtifactHistoryView, ArtifactView } from "#artifact-views.ts";
import { ChangeView } from "#change-views.ts";
import { AwaitingRulingView } from "#rulings/views.ts";

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

// why: a report body is agent-authored prose, so it is read on demand rather
// than carried on every voyage feed alongside the titles.
export const ReportMarkdown = Schema.Struct({
	authorAgentId: Schema.NullOr(Schema.String),
	markdown: Schema.String,
	reportId: Schema.String,
	title: Schema.String,
});
export type ReportMarkdown = typeof ReportMarkdown.Type;

// why: a piece's state is derived from its edges, its stamps, the verdicts
// landed on it, who is at work on it and what it is still waiting to land —
// the contract carries the outcome of that ladder so a window renders what the
// domain concluded instead of concluding it again. Abandoned is one of these
// words rather than a mark on done, because a piece written off and a piece
// delivered are not the same news however alike they are to sort.
export const PieceState = Schema.Literals(["abandoned", "active", "blocked", "done", "held", "landing", "parked", "ready"]);
export type PieceState = typeof PieceState.Type;

export const BoardEntryView = Schema.Struct({
	authorAgentId: Schema.NullOr(Schema.String),
	body: Schema.String,
	createdAt: Schema.String,
	id: Schema.String,
	register: BoardRegisterSchema,
});
export type BoardEntryView = typeof BoardEntryView.Type;

export const PieceView = Schema.Struct({
	agents: Schema.Array(PieceAgentView),
	artifactHistory: Schema.Array(ArtifactHistoryView),
	artifacts: Schema.Array(ArtifactView),
	// why: the open rulings holding this piece, each with its question, so a
	// window can say what a blocked piece waits on rather than only that it waits.
	awaitingRulings: Schema.Array(AwaitingRulingView),
	board: Schema.Array(BoardEntryView),
	// why: whether the hands that finished this piece may be released now — it
	// has landed and every agent claiming it has gone quiet. It is published
	// rather than derived because a window can see neither half: what counts as
	// landed is the outcome ladder's judgment, and what counts as quiet depends
	// on what this process is still holding, which no row of a piece says.
	canRetireCrew: Schema.Boolean,
	changes: Schema.Array(ChangeView),
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

// why: whether a captain is at work is the domain's own judgment — the same
// reading that refuses a second hail — so a window offers the hail on this
// field instead of reasoning a second time from the agent's status.
export const VoyageCaptainView = Schema.Struct({
	agentId: Schema.String,
	atWork: Schema.Boolean,
	// why: the session a hail would resume, so a window opens the captain's own
	// conversation rather than choosing among the sessions an agent has had.
	// Null while there is none to speak into — no captain yet, one still being
	// born, or a captain of record whose agent is history.
	sessionId: Schema.NullOr(Schema.String),
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
	captain: Schema.NullOr(VoyageCaptainView),
	captainBackend: Schema.String,
	counts: PieceCounts,
	crewBackend: Schema.String,
	focusedAt: Schema.NullOr(Schema.String),
	id: Schema.String,
	// why: which voyage speaks for the fleet is durable truth the window is
	// told, never a name it recognises or a position it trusts.
	kind: VoyageKindSchema,
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
