import type { AgentBackend, BackendCapacitySource, BackendFailure, OpenSessionOptions } from "@antumbra/plugin-api";
import { Effect, RcRef } from "effect";
import { codexAudit } from "#adapters/thread-audit.ts";
import { listCodexModels } from "#models.ts";
import type { CodexServer } from "#server.ts";
import { openThreadSession } from "#thread.ts";

export type CodexServerPool = RcRef.RcRef<CodexServer, BackendFailure>;

export interface CodexServerPools {
	readonly constrained: CodexServerPool;
	readonly ordinary: CodexServerPool;
}

const poolFor = (pools: CodexServerPools, options: OpenSessionOptions): CodexServerPool =>
	options.constrainedPrompt === undefined ? pools.ordinary : pools.constrained;

export const codexBackend = (pools: CodexServerPools, capacity: BackendCapacitySource): AgentBackend => ({
	audit: codexAudit(pools.ordinary),
	capacity,
	capabilities: {
		imageInput: true,
	},
	listModels: RcRef.get(pools.ordinary).pipe(Effect.flatMap(listCodexModels), Effect.scoped),
	openSession: (options) => RcRef.get(poolFor(pools, options)).pipe(Effect.flatMap((live) => openThreadSession(live, options))),
	tag: "codex",
});
