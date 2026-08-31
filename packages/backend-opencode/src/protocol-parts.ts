import { Schema } from "effect";

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

export const KnownPart = Schema.Union([TextPart, ReasoningPart, ToolPart, StepFinishPart]);
export type KnownPart = typeof KnownPart.Type;

export const PartUpdatedProperties = Schema.Struct({ part: Schema.Unknown });
