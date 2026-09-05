import { type AgentBackend, noSessionAudit } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { piFailure } from "#failure.ts";
import { modelChoices } from "#models.ts";
import type { PiRuntime } from "#runtime.ts";
import { openPiSession } from "#session.ts";

export const piBackend = (runtime: PiRuntime): AgentBackend => ({
	audit: noSessionAudit,
	capabilities: {
		imageInput: false,
	},
	listModels: Effect.try({ catch: piFailure, try: () => modelChoices(runtime.models()) }),
	openSession: (options) => openPiSession(runtime, options),
	tag: "pi",
});
