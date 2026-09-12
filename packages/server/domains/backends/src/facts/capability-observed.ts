import { fact } from "@antumbra/platform-feature/fact.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Schema } from "effect";

export const capabilityObserved = fact("CapabilityObserved", {
	backend: AgentBackendTagSchema,
	imageInput: Schema.Boolean,
});
