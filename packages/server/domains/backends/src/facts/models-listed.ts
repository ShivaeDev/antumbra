import { fact } from "@antumbra/platform-feature/fact.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Schema } from "effect";

const ListedModel = Schema.Struct({
	model: Schema.String,
	name: Schema.String,
	isDefault: Schema.Boolean,
	defaultEffort: Schema.NullOr(Schema.String),
	efforts: Schema.Array(Schema.String),
});

export const modelsListed = fact("ModelsListed", {
	backend: AgentBackendTagSchema,
	failure: Schema.NullOr(Schema.String),
	models: Schema.Array(ListedModel),
});
