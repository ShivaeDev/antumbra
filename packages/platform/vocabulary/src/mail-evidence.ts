import { Schema } from "effect";
import { SessionExecutionStatusSchema } from "#agent-runtime/session-execution.ts";
import { AgentSessionStatusSchema, AgentStatusSchema } from "#agent-runtime/statuses.ts";
import { VoyageId } from "#voyage.ts";

export const MailWakeEvidence = Schema.Struct({
	quietMillis: Schema.Number,
	agents: Schema.Array(Schema.Struct({ id: Schema.String, status: AgentStatusSchema })),
	sessions: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			agentId: Schema.String,
			status: AgentSessionStatusSchema,
			executionStatus: SessionExecutionStatusSchema,
			parentSessionId: Schema.NullOr(Schema.String),
			stoppedAt: Schema.NullOr(Schema.String),
		}),
	),
	crew: Schema.Array(Schema.Struct({ agentId: Schema.String, voyageId: VoyageId })),
});
