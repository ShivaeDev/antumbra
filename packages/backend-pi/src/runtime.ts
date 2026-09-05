import type { AgentSessionEvent, ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { PiThinkingLevel } from "#effort.ts";

export type PiEvent = AgentSessionEvent;

export interface PiModel {
	readonly id: string;
	readonly name: string;
}

export interface PiOpenRequest {
	readonly cwd: string;
	readonly effort: PiThinkingLevel | undefined;
	readonly model: string | undefined;
	readonly resume: string | undefined;
	readonly tools: ReadonlyArray<ToolDefinition>;
}

export interface PiSession {
	readonly abort: () => Promise<void>;
	readonly dispose: () => void;
	// Resolves once pi has accepted the text, not when the run it starts is over.
	readonly prompt: (text: string, delivery: "followUp" | "steer") => Promise<void>;
	readonly sessionFile: string;
	readonly sessionId: string;
	readonly subscribe: (listener: (event: PiEvent) => void) => () => void;
}

export interface PiRuntime {
	readonly models: () => ReadonlyArray<PiModel>;
	readonly open: (request: PiOpenRequest) => Promise<PiSession>;
}
