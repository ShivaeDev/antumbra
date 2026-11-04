import { Schema } from "effect";
import { AgentBackendTagSchema } from "#agent-backend.ts";

export const CapabilityObservedPayload = Schema.Struct({
	backend: AgentBackendTagSchema,
	imageInput: Schema.Boolean,
});

const ListedModel = Schema.Struct({
	model: Schema.String,
	name: Schema.String,
	isDefault: Schema.Boolean,
	defaultEffort: Schema.NullOr(Schema.String),
	efforts: Schema.Array(Schema.String),
});

export const ModelsListedPayload = Schema.Struct({
	backend: AgentBackendTagSchema,
	failure: Schema.NullOr(Schema.String),
	models: Schema.Array(ListedModel),
});
export const BackendsEvent = Schema.Union([
	Schema.Struct({ _tag: Schema.Literal("CapabilityObserved"), ...CapabilityObservedPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("ModelsListed"), ...ModelsListedPayload.fields, at: Schema.Number }),
]);
