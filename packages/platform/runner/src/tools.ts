import { Schema } from "effect";

export const ToolDescriptor = Schema.Struct({
	description: Schema.String,
	inputSchema: Schema.Record(Schema.String, Schema.Unknown),
	name: Schema.String,
});
export type ToolDescriptor = typeof ToolDescriptor.Type;
export const ToolSet = Schema.Struct({ version: Schema.String, tools: Schema.Array(ToolDescriptor) });
export type ToolSet = typeof ToolSet.Type;
export const ToolCall = Schema.Struct({ sessionId: Schema.String, callId: Schema.String, name: Schema.String, input: Schema.Unknown });
export type ToolCall = typeof ToolCall.Type;
export const ToolAnswer = Schema.Struct({ ok: Schema.Boolean, text: Schema.String });
export type ToolAnswer = typeof ToolAnswer.Type;
