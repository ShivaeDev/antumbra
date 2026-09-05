import type { PrismaError } from "@antumbra/persistence";
import type { AgentBackend, DirectTool, OpenSessionOptions } from "@antumbra/plugin-api";
import { Context, type Effect } from "effect";
import type { SessionRecoveryContext } from "#recovery/context.ts";
import type { SinkFor } from "#tree/sink/sink-for.ts";

export interface SessionRecoveryOptions {
	readonly backends: ReadonlyMap<string, AgentBackend>;
	readonly settingsFor: (context: SessionRecoveryContext) => Effect.Effect<Pick<OpenSessionOptions, "effort" | "model">, PrismaError>;
	readonly sinkFor: SinkFor;
	readonly toolsFor: (context: SessionRecoveryContext) => Effect.Effect<ReadonlyArray<DirectTool>>;
}

export class RecoveryOptions extends Context.Service<RecoveryOptions, SessionRecoveryOptions>()("@antumbra/sessions/RecoveryOptions") {}
