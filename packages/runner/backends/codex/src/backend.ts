import type { AgentBackend, BackendFailure, OpenSessionOptions } from "@antumbra/runner-ports/backend.ts";
import type { BackendCapacitySource } from "@antumbra/runner-ports/backend-capacity.ts";
import { Context, Effect, RcRef } from "effect";
import { listCodexModels } from "#models.ts";
import type { CodexServer } from "#server.ts";
import { openThreadSession } from "#thread.ts";
import { codexAudit } from "#thread-audit.ts";

export type CodexServerPool = RcRef.RcRef<CodexServer, BackendFailure>;

interface CodexServerPools {
	readonly capacity: BackendCapacitySource;
	readonly constrained: CodexServerPool;
	readonly ordinary: CodexServerPool;
}

export class CodexServers extends Context.Service<CodexServers, CodexServerPools>()("@antumbra/runner-backends-codex/CodexServers") {}

const poolFor = (pools: CodexServerPools, options: OpenSessionOptions): CodexServerPool =>
	options.constrainedPrompt === undefined ? pools.ordinary : pools.constrained;

export const codexBackend: Effect.Effect<AgentBackend, never, CodexServers> = Effect.gen(function* () {
	const pools = yield* CodexServers;
	return {
		audit: codexAudit(pools.ordinary),
		capacity: pools.capacity,
		capabilities: {
			imageInput: true,
		},
		listModels: RcRef.get(pools.ordinary).pipe(Effect.flatMap(listCodexModels), Effect.scoped),
		openSession: (options) => RcRef.get(poolFor(pools, options)).pipe(Effect.flatMap((live) => openThreadSession(live, options))),
		tag: "codex",
	} satisfies AgentBackend;
});
