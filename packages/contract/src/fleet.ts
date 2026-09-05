import { ResourceReclaimStateSchema, SessionPresenceSchema } from "@antumbra/vocabulary/agent-runtime";
import { Schema } from "effect";
import { RoleSettings } from "#agent-settings.ts";
import { SessionSituation } from "#session-situations.ts";
import { AgentDiagnostics, FleetDiagnostics, SessionDiagnostics } from "#sight-diagnostics.ts";

export const SessionSummary = Schema.Struct({
	addressable: Schema.Array(SessionSituation),
	backend: Schema.String,
	canAttachImages: Schema.Boolean,
	canInterrupt: Schema.Boolean,
	canSend: Schema.Boolean,
	canSleep: Schema.Boolean,
	cwd: Schema.String,
	diag: SessionDiagnostics,
	id: Schema.String,
	presence: SessionPresenceSchema,
	status: Schema.String,
});
export type SessionSummary = typeof SessionSummary.Type;

export const BerthSummary = Schema.Struct({
	branch: Schema.String,
	reclaimState: Schema.NullOr(ResourceReclaimStateSchema),
	slug: Schema.String,
	status: Schema.String,
});
export type BerthSummary = typeof BerthSummary.Type;

export const PieceWork = Schema.Struct({
	kind: Schema.Literal("piece"),
	pieceId: Schema.String,
	pieceTitle: Schema.String,
	voyageId: Schema.String,
	voyageName: Schema.String,
});
export type PieceWork = typeof PieceWork.Type;

export const VoyageCommand = Schema.Struct({
	kind: Schema.Literal("voyage"),
	voyageId: Schema.String,
	voyageName: Schema.String,
});
export type VoyageCommand = typeof VoyageCommand.Type;

export const AgentWork = Schema.Union([PieceWork, VoyageCommand]);
export type AgentWork = typeof AgentWork.Type;

export const AgentSummary = Schema.Struct({
	berths: Schema.Array(BerthSummary),
	canRetire: Schema.Boolean,
	charter: Schema.String,
	diag: AgentDiagnostics,
	id: Schema.String,
	role: Schema.String,
	sessions: Schema.Array(SessionSummary),
	status: Schema.String,
	work: Schema.Array(AgentWork),
});
export type AgentSummary = typeof AgentSummary.Type;

export const RepoSummary = Schema.Struct({
	defaultRef: Schema.String,
	id: Schema.String,
	name: Schema.String,
	source: Schema.String,
});
export type RepoSummary = typeof RepoSummary.Type;

export const BackendCapacitySummary = Schema.Struct({
	backend: Schema.String,
	detail: Schema.NullOr(Schema.String),
	reason: Schema.NullOr(Schema.String),
	resetsAt: Schema.NullOr(Schema.Number),
	status: Schema.Literals(["available", "warning", "blocked"]),
	utilization: Schema.NullOr(Schema.Number),
});
export type BackendCapacitySummary = typeof BackendCapacitySummary.Type;

export const ModelChoice = Schema.Struct({
	efforts: Schema.Array(Schema.String),
	id: Schema.String,
	isDefault: Schema.Boolean,
	name: Schema.String,
});
export type ModelChoice = typeof ModelChoice.Type;

export const Fleet = Schema.Struct({
	agents: Schema.Array(AgentSummary),
	backends: Schema.Array(Schema.String),
	capacities: Schema.Array(BackendCapacitySummary),
	diag: FleetDiagnostics,
	repos: Schema.Array(RepoSummary),
	roleSettings: Schema.Array(RoleSettings),
});
export type Fleet = typeof Fleet.Type;
