import { type AgentBackend, type BackendFailure, noSessionAudit } from "@antumbra/plugin-api";
import { Effect, RcRef } from "effect";
import type { OpencodeServer } from "#server.ts";
import { openOpencodeSession } from "#session.ts";

export const opencodeBackend = (server: RcRef.RcRef<OpencodeServer, BackendFailure>): AgentBackend => ({
	audit: noSessionAudit,
	capabilities: {
		imageInput: false,
	},
	listModels: Effect.succeed([]),
	openSession: (options) => RcRef.get(server).pipe(Effect.flatMap((live) => openOpencodeSession(live, options))),
	tag: "opencode",
});
