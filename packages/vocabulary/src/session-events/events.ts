import { Schema } from "effect";
import { Raw, RawEvent } from "#session-events/raw.ts";
import {
	SubsessionEnded,
	SubsessionGap,
	SubsessionOpened,
} from "#session-events/subsessions.ts";

// why: the one vocabulary every side speaks — backends map their provider's
// wire messages onto it, the log stores it, the renderer derives from it. This
// package is a leaf on purpose: it must be importable by ports and views alike.
export const SessionOpened = Schema.Struct({
	nativeRef: Schema.String,
	raw: Raw,
	type: Schema.Literal("session.opened"),
});

// why: work a session delegated is still the session's work, but the log must
// not claim the session's own turn produced it. Origin rides the events a
// subsession produced and is absent on the root session's own turns, so every
// row written before it existed stays valid. Depth is never asserted here — it
// is a property of the tree, walked from the opened events when read.
export const Origin = Schema.Struct({
	parentNode: Schema.optional(Schema.String),
	spawnedBy: Schema.String,
});
export type Origin = typeof Origin.Type;

export const MessageEvent = Schema.Struct({
	origin: Schema.optional(Origin),
	raw: Raw,
	role: Schema.Literals(["agent", "user"]),
	text: Schema.String,
	type: Schema.Literal("message"),
});

export const ThinkingEvent = Schema.Struct({
	origin: Schema.optional(Origin),
	raw: Raw,
	text: Schema.String,
	type: Schema.Literal("thinking"),
});

export const ToolStarted = Schema.Struct({
	input: Schema.String,
	name: Schema.String,
	origin: Schema.optional(Origin),
	raw: Raw,
	toolId: Schema.String,
	type: Schema.Literal("tool.started"),
});

export const ToolCompleted = Schema.Struct({
	ok: Schema.Boolean,
	origin: Schema.optional(Origin),
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

export const AgentEvent = Schema.Union([
	SessionOpened,
	MessageEvent,
	ThinkingEvent,
	ToolStarted,
	ToolCompleted,
	UsageEvent,
	TurnCompleted,
	SubsessionOpened,
	SubsessionEnded,
	SubsessionGap,
	RawEvent,
]);
export type AgentEvent = typeof AgentEvent.Type;
