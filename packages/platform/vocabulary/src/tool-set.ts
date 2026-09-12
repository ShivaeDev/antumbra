import { Schema } from "effect";

export const ToolDescriptor = Schema.Struct({
	description: Schema.String,
	inputSchema: Schema.Record(Schema.String, Schema.Unknown),
	name: Schema.String,
});
export type ToolDescriptor = typeof ToolDescriptor.Type;
export const ToolSet = Schema.Struct({ version: Schema.String, tools: Schema.Array(ToolDescriptor) });
export type ToolSet = typeof ToolSet.Type;
