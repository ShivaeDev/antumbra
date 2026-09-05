import type { Effect } from "effect";

export interface DirectToolOutcome {
	readonly ok: boolean;
	readonly text: string;
}

export interface ToolDefinition {
	readonly description: string;
	// Every provider adapter accepts this shared Draft 7 object-schema subset.
	readonly inputSchema: Record<string, unknown>;
	readonly name: string;
}

export interface DirectTool extends ToolDefinition {
	readonly call: (args: unknown) => Effect.Effect<DirectToolOutcome>;
}
