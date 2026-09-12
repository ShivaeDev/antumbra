import { row } from "@antumbra/platform-feature/row.ts";
import { SessionExecutionStatusSchema } from "@antumbra/platform-vocabulary/agent-runtime/session-execution.ts";
import { AgentSessionCompletenessSchema, AgentSessionStatusSchema } from "@antumbra/platform-vocabulary/agent-runtime/statuses.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";

export const session = row(
	"session",
	{
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
		openDelegations: Schema.Number,
		toolCalls: Schema.Number,
		createdAt: Schema.String,
	},
	{ key: "id", scope: "agentId" },
);
