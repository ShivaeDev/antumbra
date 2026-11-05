import { backendCatalog } from "@antumbra/domain-backends/rows/backend-catalog.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Schema } from "effect";
import { capacityReleased } from "#facts/released.ts";

export const release = command("release", {
	input: capacityReleased.payload,
	reads: [backendCatalog],
	emits: capacityReleased,
	rejections: { UnknownBackend: { backend: AgentBackendTagSchema, message: Schema.String } },
});
