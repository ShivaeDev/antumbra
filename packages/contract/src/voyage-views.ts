import { BoardRegisterSchema } from "@antumbra/vocabulary/board";
import { VoyageKindSchema } from "@antumbra/vocabulary/voyage";
import { Schema } from "effect";
import { AgentSettingsChoice } from "#agent-settings.ts";
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

export const ReportMarkdown = Schema.Struct({
	authorAgentId: Schema.NullOr(Schema.String),
	markdown: Schema.String,
	reportId: Schema.String,
	title: Schema.String,
});
export type ReportMarkdown = typeof ReportMarkdown.Type;

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
	awaitingRulings: Schema.Array(AwaitingRulingView),
	board: Schema.Array(BoardEntryView),
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

export const VoyageCaptainView = Schema.Struct({
	agentId: Schema.String,
	atWork: Schema.Boolean,
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

export const VoyageState = Schema.Literals(["quiet", "underWay"]);
export type VoyageState = typeof VoyageState.Type;

export const VoyageSummary = Schema.Struct({
	captain: Schema.NullOr(VoyageCaptainView),
	captainSettings: AgentSettingsChoice,
	counts: PieceCounts,
	crewSettings: AgentSettingsChoice,
	focusedAt: Schema.NullOr(Schema.String),
	id: Schema.String,
	kind: VoyageKindSchema,
	name: Schema.String,
	northStar: Schema.String,
	state: VoyageState,
});
export type VoyageSummary = typeof VoyageSummary.Type;

export const BoardSmoothing = Schema.Struct({
	state: Schema.Literals(["failed", "idle", "running"]),
	uncovered: Schema.Number,
});
export type BoardSmoothing = typeof BoardSmoothing.Type;

export const VoyageView = Schema.Struct({
	...VoyageSummary.fields,
	board: Schema.Array(BoardEntryView),
	context: Schema.String,
	crew: Schema.Array(CrewMemberView),
	pieces: Schema.Array(PieceView),
	smoothing: BoardSmoothing,
});
export type VoyageView = typeof VoyageView.Type;
