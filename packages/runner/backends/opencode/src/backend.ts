import type { AgentBackend, BackendFailure, OpenSessionOptions } from "@antumbra/runner-ports/backend.ts";
import { noSessionAudit } from "@antumbra/runner-ports/session-audit.ts";
import { Effect, type Scope } from "effect";
import { listOpencodeModels } from "#models.ts";
import type { OpencodeServer } from "#server.ts";
import { openOpencodeSession } from "#session.ts";

export interface OpencodeServers {
	readonly catalogue: Effect.Effect<OpencodeServer, BackendFailure, Scope.Scope>;
	readonly open: (options: OpenSessionOptions) => Effect.Effect<OpencodeServer, BackendFailure, Scope.Scope>;
}

export const opencodeBackend = (servers: OpencodeServers): AgentBackend => ({
	audit: noSessionAudit,
	capabilities: { imageInput: false },
	listModels: servers.catalogue.pipe(Effect.flatMap(listOpencodeModels), Effect.scoped),
	openSession: (options) => servers.open(options).pipe(Effect.flatMap((live) => openOpencodeSession(live, options))),
	tag: "opencode",
});
