import { Schema } from "effect";
export const ToolAnswer = Schema.Struct({ ok: Schema.Boolean, text: Schema.String });
export type ToolAnswer = typeof ToolAnswer.Type;
