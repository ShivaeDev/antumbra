import { Schema } from "effect";

export const ToolContext = Schema.Struct({
	agentId: Schema.String,
	pieceId: Schema.optional(Schema.String),
	voyageId: Schema.optional(Schema.String),
	sessionId: Schema.String,
	callId: Schema.String,
});
export type ToolContext = typeof ToolContext.Type;
