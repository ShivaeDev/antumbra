import type { EffortLevel } from "@anthropic-ai/claude-agent-sdk";
import type { BackendFailure, ModelChoice, OpenSessionOptions } from "@antumbra/runner-ports/backend.ts";
import type { BackendCapacityController } from "@antumbra/runner-ports/backend-capacity.ts";
import type { SessionAudit } from "@antumbra/runner-ports/session-audit.ts";
import type { DirectTool, DirectToolOutcome } from "@antumbra/runner-ports/tools.ts";
import { Context, type Effect, type Scope } from "effect";
import type { Delivery } from "#session-lanes.ts";

export const TOOL_SERVER_NAME = "antumbra";

export type ToolCall = (tool: DirectTool, callId: string, args: unknown) => Promise<DirectToolOutcome>;

export interface RawEventListener {
	readonly deliver: (delivery: Delivery) => void;
	readonly end: () => void;
	readonly fail: (error: unknown) => void;
	readonly recorded: (agentId: string) => boolean;
}

export interface RawSession {
	readonly interrupt: () => Promise<void>;
	readonly queue: (text: string) => Effect.Effect<void, BackendFailure>;
	readonly steer: (text: string) => Effect.Effect<void, BackendFailure>;
	readonly subscribe: (listener: RawEventListener) => void;
}

export interface RawSessionRequest {
	readonly session: OpenSessionOptions;
	readonly effort: EffortLevel | undefined;
	readonly call: ToolCall;
	readonly observeCapacity: BackendCapacityController["observe"];
}

export class ClaudeRuntime extends Context.Service<
	ClaudeRuntime,
	{
		readonly audit: SessionAudit;
		readonly listModels: Effect.Effect<ReadonlyArray<ModelChoice>, BackendFailure>;
		readonly open: (request: RawSessionRequest) => Effect.Effect<RawSession, never, Scope.Scope>;
	}
>()("@antumbra/runner-backends-claude/ClaudeRuntime") {}
