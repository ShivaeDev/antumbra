import { SubsessionOutcome } from "@antumbra/platform-vocabulary/session-events/subsessions.ts";
import { SessionInputId, SessionMessagePart } from "@antumbra/platform-vocabulary/session-input.ts";
import { Schema } from "effect";

export const TranscriptMessage = Schema.Struct({
	inputId: Schema.optional(Schema.UndefinedOr(SessionInputId)),
	kind: Schema.Literal("message"),
	parts: Schema.Array(SessionMessagePart),
	role: Schema.Literals(["agent", "user"]),
	seq: Schema.Number,
	served: Schema.optional(Schema.Literals(["charter", "steer", "wake"])),
	standingOrders: Schema.optional(Schema.String),
	text: Schema.String,
});
export type TranscriptMessage = typeof TranscriptMessage.Type;
export const TranscriptThinking = Schema.Struct({ kind: Schema.Literal("thinking"), seq: Schema.Number, text: Schema.String });
export type TranscriptThinking = typeof TranscriptThinking.Type;
export const TranscriptTool = Schema.Struct({
	input: Schema.String,
	kind: Schema.Literal("tool"),
	name: Schema.String,
	ok: Schema.optional(Schema.UndefinedOr(Schema.Boolean)),
	providerName: Schema.optional(Schema.String),
	result: Schema.optional(Schema.UndefinedOr(Schema.String)),
	seq: Schema.Number,
	servedBy: Schema.optional(Schema.Literal("antumbra")),
});
export type TranscriptTool = typeof TranscriptTool.Type;
export const TranscriptRaw = Schema.Struct({ kind: Schema.Literal("raw"), label: Schema.String, payload: Schema.String, seq: Schema.Number });
export type TranscriptRaw = typeof TranscriptRaw.Type;
export const TranscriptDelegation = Schema.Struct({
	displayName: Schema.String,
	kind: Schema.Literal("delegation"),
	nodeId: Schema.optional(Schema.UndefinedOr(Schema.String)),
	outcome: Schema.optional(Schema.UndefinedOr(SubsessionOutcome)),
	seq: Schema.Number,
	state: Schema.Literals(["ended", "opened"]),
});
export type TranscriptDelegation = typeof TranscriptDelegation.Type;
export const TranscriptNotice = Schema.Struct({
	detail: Schema.optional(Schema.UndefinedOr(Schema.String)),
	kind: Schema.Literal("notice"),
	seq: Schema.Number,
	title: Schema.String,
});
export type TranscriptNotice = typeof TranscriptNotice.Type;
export const TranscriptItem = Schema.Union([
	TranscriptMessage,
	TranscriptThinking,
	TranscriptTool,
	TranscriptRaw,
	TranscriptDelegation,
	TranscriptNotice,
	Schema.Struct({ kind: Schema.Literal("telemetry"), label: Schema.String, seq: Schema.Number }),
]);
export type TranscriptItem = typeof TranscriptItem.Type;
