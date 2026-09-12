import type { AgentBackend } from "@antumbra/runner-ports/backend.ts";
import { noSessionAudit } from "@antumbra/runner-ports/session-audit.ts";
import { Effect } from "effect";
import { modelChoices } from "#models.ts";
import type { PiRuntime } from "#runtime.ts";
import { openPiSession } from "#session.ts";

export const piBackend = (runtime: PiRuntime): AgentBackend => ({
	audit: noSessionAudit,
	capabilities: {
		imageInput: false,
	},
	listModels: runtime.models.pipe(Effect.map(modelChoices)),
	openSession: (options) => openPiSession(runtime, options),
	tag: "pi",
});
