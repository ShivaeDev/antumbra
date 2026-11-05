import { query } from "@antumbra/platform-feature/query.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { backendCatalog } from "#rows/backend-catalog.ts";

export const catalog = query("catalog", {
	input: { backend: AgentBackendTagSchema },
	output: backendCatalog.Row,
	reads: [backendCatalog],
	scope: (input) => input.backend,
});
