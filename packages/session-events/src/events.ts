import { Schema } from "effect";

// why: the one vocabulary every side speaks — backends map their provider's
// wire messages onto it, the log stores it, the renderer derives from it.
// `raw` carries the provider payload verbatim on every event so the log
// stays the wire truth while consumers stay backend-blind. This package is
// a leaf on purpose: it must be importable by ports and views alike.
const Raw = Schema.Struct({
	kind: Schema.String,
	payload: Schema.String,
	source: Schema.String,
});

export const SessionOpened = Schema.Struct({
	nativeRef: Schema.String,
	raw: Raw,
	type: Schema.Literal("session.opened"),
});

export const MessageEvent = Schema.Struct({
	raw: Raw,
	role: Schema.Literals(["agent", "user"]),
	text: Schema.String,
	type: Schema.Literal("message"),
});

export const ThinkingEvent = Schema.Struct({
	raw: Raw,
	text: Schema.String,
	type: Schema.Literal("thinking"),
});

export const ToolStarted = Schema.Struct({
	input: Schema.String,
	name: Schema.String,
	raw: Raw,
	toolId: Schema.String,
	type: Schema.Literal("tool.started"),
});

export const ToolCompleted = Schema.Struct({
	ok: Schema.Boolean,
	output: Schema.String,
	raw: Raw,
	toolId: Schema.String,
	type: Schema.Literal("tool.completed"),
});

export const UsageEvent = Schema.Struct({
	costUsd: Schema.optional(Schema.Number),
	inputTokens: Schema.Number,
	model: Schema.optional(Schema.String),
	outputTokens: Schema.Number,
	raw: Raw,
	type: Schema.Literal("usage"),
});

export const TurnStatus = Schema.Literals([
	"completed",
	"failed",
	"interrupted",
]);

export const TurnCompleted = Schema.Struct({
	durationMs: Schema.optional(Schema.Number),
	raw: Raw,
	status: TurnStatus,
	type: Schema.Literal("turn.completed"),
});

export const RawEvent = Schema.Struct({
	raw: Raw,
	type: Schema.Literal("raw"),
});

export const AgentEvent = Schema.Union([
	SessionOpened,
	MessageEvent,
	ThinkingEvent,
	ToolStarted,
	ToolCompleted,
	UsageEvent,
	TurnCompleted,
	RawEvent,
]);
export type AgentEvent = typeof AgentEvent.Type;
export type RawPayload = typeof Raw.Type;
