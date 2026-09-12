import type { BackendFailure } from "@antumbra/runner-ports/backend.ts";
import type { AgentSessionEvent, ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { Effect } from "effect";
import type { PiThinkingLevel } from "#effort.ts";

export type PiEvent = AgentSessionEvent;

export interface PiModel {
	readonly id: string;
	readonly name: string;
}

export interface PiOpenRequest {
	readonly constrainedPrompt: string | undefined;
	readonly cwd: string;
	readonly effort: PiThinkingLevel | undefined;
	readonly model: string | undefined;
	readonly resume: string | undefined;
	readonly tools: ReadonlyArray<ToolDefinition>;
}

export interface PiSession {
	readonly abort: Effect.Effect<void>;
	readonly dispose: Effect.Effect<void>;
	readonly prompt: (text: string, delivery: "followUp" | "steer") => Effect.Effect<void, BackendFailure>;
	readonly sessionFile: string;
	readonly sessionId: string;
	readonly subscribe: (listener: (event: PiEvent) => void) => () => void;
}

export interface PiRuntime {
	readonly models: Effect.Effect<ReadonlyArray<PiModel>>;
	readonly open: (request: PiOpenRequest) => Effect.Effect<PiSession>;
}
