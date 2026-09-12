import type { ToolAnswer } from "@antumbra/platform-vocabulary/tool-answer.ts";
import type { ToolDescriptor } from "@antumbra/platform-vocabulary/tool-set.ts";
import type { Effect } from "effect";

export type DirectToolOutcome = ToolAnswer;
export type ToolDefinition = ToolDescriptor;

export interface DirectTool extends ToolDescriptor {
	readonly call: (callId: string, args: unknown) => Effect.Effect<ToolAnswer>;
}
