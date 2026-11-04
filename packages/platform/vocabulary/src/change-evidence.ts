import { Schema } from "effect";
import { AgentStatusSchema, BerthStatusSchema, MoorageStatusSchema, ResourceReclaimStateSchema } from "#agent-runtime/statuses.ts";
import { AgentId, PieceAgentId } from "#agents-ids.ts";
import { Request } from "#id.ts";
import { PieceId } from "#piece.ts";
import { BerthId, HeldResourceId } from "#reclamation-ids.ts";
import { VoyageId } from "#voyage.ts";
export const Berth = Schema.Struct({
	id: BerthId,
	agentId: Schema.String,
	runner: Schema.String,
	source: Schema.String,
	slug: Schema.String,
	ref: Schema.String,
	branch: Schema.String,
	path: Schema.String,
	status: BerthStatusSchema,
	reclaimRequestId: Schema.NullOr(Request),
	reclaimResult: Schema.NullOr(Schema.Literals(["held", "failed"])),
	reclaimState: Schema.NullOr(ResourceReclaimStateSchema),
	strandedAt: Schema.NullOr(Schema.Number),
});
export const Moorage = Schema.Struct({
	agentId: Schema.String,
	runner: Schema.String,
	root: Schema.String,
	status: MoorageStatusSchema,
	reclaimState: Schema.NullOr(ResourceReclaimStateSchema),
});
export const Agent = Schema.Struct({
	id: AgentId,
	role: Schema.String,
	status: AgentStatusSchema,
	currentSessionId: Schema.NullOr(Schema.String),
	createdAt: Schema.String,
	updatedAt: Schema.String,
});
export const HeldResource = Schema.Struct({
	id: HeldResourceId,
	berthId: BerthId,
	changeId: Schema.String,
});
export const VoyageActivity = Schema.Struct({
	id: Schema.String,
	voyageId: VoyageId,
	sourceKind: Schema.Literals(["session", "change"]),
	sourceId: Schema.String,
	at: Schema.String,
});
export const PieceAgent = Schema.Struct({ id: PieceAgentId, pieceId: PieceId, agentId: AgentId, assignedAt: Schema.String });
export const VoyageCaptainWork = Schema.Struct({
	id: Schema.String,
	voyageId: VoyageId,
	agentId: Schema.String,
	working: Schema.Boolean,
});

export const ResourceOwner = Schema.Struct({ agentId: Schema.String, status: AgentStatusSchema, openSessions: Schema.Number });
