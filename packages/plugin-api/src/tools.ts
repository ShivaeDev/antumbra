import type { Effect } from "effect";

export interface DirectToolOutcome {
	readonly ok: boolean;
	readonly text: string;
}

export interface DirectTool {
	readonly call: (args: unknown) => Effect.Effect<DirectToolOutcome>;
	readonly description: string;
	// Both provider adapters accept this shared Draft 7 object-schema subset.
	readonly inputSchema: Record<string, unknown>;
	readonly name: string;
}
