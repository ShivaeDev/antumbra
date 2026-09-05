import { type AgentBackend, type BackendFailure, noSessionAudit, type OpenSessionOptions } from "@antumbra/plugin-api";
import { Effect, RcRef } from "effect";
import { listOpencodeModels } from "#models.ts";
import type { OpencodeServer } from "#server.ts";
import { openOpencodeSession } from "#session.ts";

export type OpencodeServerPool = RcRef.RcRef<OpencodeServer, BackendFailure>;

export interface OpencodeServerPools {
	readonly constrained: OpencodeServerPool;
	readonly ordinary: OpencodeServerPool;
}

const poolFor = (pools: OpencodeServerPools, options: OpenSessionOptions): OpencodeServerPool =>
	options.constrainedPrompt === undefined ? pools.ordinary : pools.constrained;

export const opencodeBackend = (pools: OpencodeServerPools): AgentBackend => ({
	audit: noSessionAudit,
	capabilities: {
		imageInput: false,
	},
	listModels: RcRef.get(pools.ordinary).pipe(Effect.flatMap(listOpencodeModels), Effect.scoped),
	openSession: (options) => RcRef.get(poolFor(pools, options)).pipe(Effect.flatMap((live) => openOpencodeSession(live, options))),
	tag: "opencode",
});
