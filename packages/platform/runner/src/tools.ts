import { Schema } from "effect";

export const ToolCall = Schema.Struct({ sessionId: Schema.String, callId: Schema.String, name: Schema.String, input: Schema.Unknown });
export type ToolCall = typeof ToolCall.Type;
