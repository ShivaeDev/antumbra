import { Schema } from "effect";
import { Origin } from "#session-events/origin.ts";
import { RateLimitEvent } from "#session-events/rate-limit.ts";
import { Raw, RawEvent } from "#session-events/raw.ts";
import { SessionBackgroundEvent, SessionStateEvent } from "#session-events/state.ts";
import { SubsessionEnded, SubsessionGap, SubsessionOpened } from "#session-events/subsessions.ts";
import { UsageEvent } from "#session-events/usage.ts";
import { SessionInputId, SessionMessagePart } from "#session-input.ts";

// why: the one vocabulary every side speaks — backends map their provider's
// wire messages onto it, the log stores it, the renderer derives from it. This
// package is a leaf on purpose: it must be importable by ports and views alike.
export const SessionOpened = Schema.Struct({
	nativeRef: Schema.String,
	raw: Raw,
	type: Schema.Literal("session.opened"),
});

export const MessageEvent = Schema.Struct({
	inputId: Schema.optional(SessionInputId),
	origin: Schema.optional(Origin),
	parts: Schema.optional(Schema.Array(SessionMessagePart)),
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
	providerName: Schema.optional(Schema.String),
	raw: Raw,
	servedBy: Schema.optional(Schema.Literal("antumbra")),
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

export const TurnStatus = Schema.Literals(["completed", "failed", "interrupted"]);

export const TurnCompleted = Schema.Struct({
	durationMs: Schema.optional(Schema.Number),
	origin: Schema.optional(Origin),
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
	RateLimitEvent,
	TurnCompleted,
	SessionStateEvent,
	SessionBackgroundEvent,
	SubsessionOpened,
	SubsessionEnded,
	SubsessionGap,
	RawEvent,
]);
export type AgentEvent = typeof AgentEvent.Type;
