import { Schema } from "effect";
import { SessionExecutionStatusSchema } from "#agent-runtime/session-execution.ts";
import { AgentSessionCompletenessSchema, AgentSessionStatusSchema } from "#agent-runtime/statuses.ts";
import { SessionId } from "#session-ids.ts";

export const Session = Schema.Struct({
	id: SessionId,
	agentId: Schema.String,
	backend: Schema.String,
	cwd: Schema.String,
	nativeRef: Schema.NullOr(Schema.String),
	status: AgentSessionStatusSchema,
	executionStatus: SessionExecutionStatusSchema,
	completeness: AgentSessionCompletenessSchema,
	outcome: Schema.NullOr(Schema.String),
	label: Schema.NullOr(Schema.String),
	kind: Schema.NullOr(Schema.String),
	parentSessionId: Schema.NullOr(SessionId),
	rootSessionId: SessionId,
	runnerId: Schema.String,
	toolSetVersion: Schema.String,
	startRequestId: Schema.String,
	charterDeliveredAt: Schema.NullOr(Schema.String),
	attached: Schema.Boolean,
	idleSince: Schema.NullOr(Schema.String),
	stoppedAt: Schema.NullOr(Schema.String),
	openDelegations: Schema.Number,
	toolCalls: Schema.Number,
	createdAt: Schema.String,
});
