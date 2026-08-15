import type { Effect } from "effect";

// why: the outcome a tool reports back to the model. There is no error
// channel: a tool that refuses, fails, or was handed nonsense still answers,
// because a silent tool is a session the agent cannot reason about.
export interface DirectToolOutcome {
	readonly ok: boolean;
	readonly text: string;
}

// why: the transport-free shape both harnesses can serve. `inputSchema` is a
// draft-07 compatible object schema because that is the intersection of what
// the two providers accept, and `name` is restricted to the characters both
// allow. Who is calling is bound when the tool is built, so nothing about
// identity travels on the wire.
export interface DirectTool {
	readonly call: (args: unknown) => Effect.Effect<DirectToolOutcome>;
	readonly description: string;
	readonly inputSchema: Record<string, unknown>;
	readonly name: string;
}

export const DIRECT_TOOL_NAME = /^[a-zA-Z0-9_-]{1,64}$/;
