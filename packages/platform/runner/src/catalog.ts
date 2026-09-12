import { Schema } from "effect";

export const ListModels = Schema.Struct({ type: Schema.Literal("ListModels"), requestId: Schema.String, backend: Schema.String });
export type ListModels = typeof ListModels.Type;
export const ModelChoice = Schema.Struct({ id: Schema.String, name: Schema.String, isDefault: Schema.Boolean, efforts: Schema.Array(Schema.String) });
export const ModelsListed = Schema.Struct({
	type: Schema.Literal("ModelsListed"),
	backend: Schema.String,
	models: Schema.Array(ModelChoice),
	failure: Schema.NullOr(Schema.String),
});
export type ModelsListed = typeof ModelsListed.Type;
