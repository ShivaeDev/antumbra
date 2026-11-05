import { query } from "@antumbra/platform-feature/query.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Schema } from "effect";
import { backendModel } from "#rows/backend-model.ts";

export const models = query("models", {
	input: { backend: AgentBackendTagSchema },
	output: Schema.Array(backendModel.Row),
	reads: [backendModel],
	scope: (input) => input.backend,
});
