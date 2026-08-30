import { Schema } from "effect";

// why: the part slice of the API. A part is re-sent whole on every change, so
// `time.end` is how a streamed text or reasoning part says it is finished and
// `state.status` is how a tool call does. Unmodelled part kinds fall through
// as raw rather than failing the frame.
const part = {
	id: Schema.String,
	messageID: Schema.String,
};

const PartTime = Schema.Struct({ end: Schema.optional(Schema.Number) });

const TextPart = Schema.Struct({
	...part,
	text: Schema.String,
	time: Schema.optional(PartTime),
	type: Schema.Literal("text"),
});

const ReasoningPart = Schema.Struct({
	...part,
	text: Schema.String,
	time: Schema.optional(PartTime),
	type: Schema.Literal("reasoning"),
});

// why: `input` arrives empty while a call is pending and is filled once it
// runs, so the call is announced on the first state that carries it.
const ToolPart = Schema.Struct({
	...part,
	callID: Schema.String,
	state: Schema.Struct({
		error: Schema.optional(Schema.String),
		input: Schema.optional(Schema.Unknown),
		output: Schema.optional(Schema.String),
		status: Schema.Literals(["pending", "running", "completed", "error"]),
	}),
	tool: Schema.String,
	type: Schema.Literal("tool"),
});

const CacheTokens = Schema.Struct({
	read: Schema.optional(Schema.Number),
	write: Schema.optional(Schema.Number),
});

// why: one model round trip's spend. opencode reports cost per step in USD
// and carries no running total, so `cumulativeCostUsd` stays absent.
const StepFinishPart = Schema.Struct({
	...part,
	cost: Schema.optional(Schema.Number),
	tokens: Schema.Struct({
		cache: Schema.optional(CacheTokens),
		input: Schema.Number,
		output: Schema.Number,
	}),
	type: Schema.Literal("step-finish"),
});

export const KnownPart = Schema.Union([
	TextPart,
	ReasoningPart,
	ToolPart,
	StepFinishPart,
]);
export type KnownPart = typeof KnownPart.Type;

export const PartUpdatedProperties = Schema.Struct({ part: Schema.Unknown });
