import { query } from "@antumbra/platform-feature/query.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Schema } from "effect";
import { backendModel } from "#rows/backend-model.ts";

export const efforts = query("efforts", {
	input: { backend: AgentBackendTagSchema, model: Schema.String },
	output: Schema.Array(Schema.String),
	reads: [backendModel],
	scope: (input) => input.backend,
});
