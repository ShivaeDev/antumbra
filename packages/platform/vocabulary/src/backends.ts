import { Schema } from "effect";
import { AgentBackendTagSchema } from "#agent-backend.ts";
import { BackendModelId } from "#backends-ids.ts";

export const BackendModel = Schema.Struct({
	id: BackendModelId,
	backend: AgentBackendTagSchema,
	model: Schema.String,
	name: Schema.String,
	isDefault: Schema.Boolean,
	defaultEffort: Schema.NullOr(Schema.String),
	efforts: Schema.Array(Schema.String),
});

export const BackendCatalog = Schema.Struct({
	backend: AgentBackendTagSchema,
	failure: Schema.NullOr(Schema.String),
	imageInput: Schema.NullOr(Schema.Boolean),
});
