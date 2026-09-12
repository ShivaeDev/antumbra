import type { ToolAnswer, ToolDescriptor } from "@antumbra/platform-runner/tools.ts";
import type { Effect } from "effect";

export type DirectToolOutcome = ToolAnswer;
export type ToolDefinition = ToolDescriptor;

export interface DirectTool extends ToolDescriptor {
	readonly call: (callId: string, args: unknown) => Effect.Effect<ToolAnswer>;
}
