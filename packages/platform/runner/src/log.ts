import { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import { ToolAnswer } from "@antumbra/platform-vocabulary/tool-answer.ts";
import { Schema } from "effect";
import { ChangeEvidence, Moorage } from "#resources.ts";
import { ToolCall } from "#tools.ts";

const session = { requestId: Schema.String, sessionId: Schema.String };
const input = { ...session, inputId: Schema.String };
export const CapacityObservationFields = {
	backend: Schema.String,
	status: Schema.Literals(["available", "blocked", "warning"]),
	reason: Schema.NullOr(Schema.Literal("usage-limit")),
	detail: Schema.NullOr(Schema.String),
	observedAt: Schema.Number,
	resetsAt: Schema.NullOr(Schema.Number),
	utilization: Schema.NullOr(Schema.Number),
};

export const LogEvent = Schema.Union([
	Schema.Struct({
		type: Schema.Literal("BerthReclaimFailed"),
		requestId: Schema.String,
		agentId: Schema.String,
		slug: Schema.String,
		reason: Schema.String,
	}),
	Schema.Struct({ type: Schema.Literal("SessionInterrupted"), ...session }),
	Schema.Struct({ type: Schema.Literal("SessionDetached"), sessionId: Schema.String }),
	Schema.Struct({
		type: Schema.Literal("ChangePushed"),
		requestId: Schema.String,
		agentId: Schema.String,
		branch: Schema.String,
		headSha: Schema.String,
	}),
	Schema.Struct({ type: Schema.Literal("CapacityObserved"), ...CapacityObservationFields }),
	Schema.Struct({
		type: Schema.Literal("SessionStarted"),
		...session,
		agentId: Schema.String,
		backend: Schema.String,
		nativeRef: Schema.String,
		cwd: Schema.String,
		toolSetVersion: Schema.String,
		runnerId: Schema.String,
	}),
	Schema.Struct({ type: Schema.Literal("SessionFailed"), ...session, reason: Schema.String }),
	Schema.Struct({ type: Schema.Literal("SessionWoke"), ...session, runnerId: Schema.String }),
	Schema.Struct({ type: Schema.Literal("SessionSlept"), ...session }),
	Schema.Struct({ type: Schema.Literal("SessionEnded"), ...session, reason: Schema.String }),
	Schema.Struct({ type: Schema.Literal("ProviderEvent"), sessionId: Schema.String, event: AgentEvent }),
	Schema.Struct({ type: Schema.Literal("InputAccepted"), ...input }),
	Schema.Struct({ type: Schema.Literal("InputFailed"), ...input, reason: Schema.String }),
	Schema.Struct({ type: Schema.Literal("InputAmbiguous"), ...input, reason: Schema.String }),
	Schema.Struct({ type: Schema.Literal("ToolCalled"), ...ToolCall.fields }),
	Schema.Struct({ type: Schema.Literal("ToolAnswered"), sessionId: Schema.String, callId: Schema.String, answer: ToolAnswer }),
	Schema.Struct({ type: Schema.Literal("MoorageProvisioned"), requestId: Schema.String, agentId: Schema.String, plan: Moorage }),
	Schema.Struct({
		type: Schema.Literal("BerthReclaimHeld"),
		requestId: Schema.String,
		agentId: Schema.String,
		slug: Schema.String,
		reason: Schema.String,
	}),
	Schema.Struct({ type: Schema.Literal("ResourceFailed"), requestId: Schema.String, reason: Schema.String }),
	Schema.Struct({ type: Schema.Literal("BerthReclaimed"), requestId: Schema.String, agentId: Schema.String, slug: Schema.String }),
	Schema.Struct({ type: Schema.Literal("ChangeCaptured"), requestId: Schema.String, evidence: ChangeEvidence }),
]);
export type LogEvent = typeof LogEvent.Type;
export const LogEntry = Schema.Struct({ logId: Schema.String, cursor: Schema.Int, at: Schema.Number, event: LogEvent });
export type LogEntry = typeof LogEntry.Type;
export const Registration = Schema.Struct({ runnerId: Schema.String, logId: Schema.String, backends: Schema.Array(Schema.String) });
export type Registration = typeof Registration.Type;
