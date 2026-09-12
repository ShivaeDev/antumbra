import { Schema } from "effect";

export const SessionResponse = Schema.Struct({
	directory: Schema.String,
	id: Schema.String,
});

const ProviderModel = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	variants: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});

const Provider = Schema.Struct({
	id: Schema.String,
	models: Schema.Record(Schema.String, ProviderModel),
});

export const ProvidersResponse = Schema.Struct({
	default: Schema.Record(Schema.String, Schema.String),
	providers: Schema.Array(Provider),
});

export const GlobalFrame = Schema.Struct({
	payload: Schema.Struct({
		properties: Schema.optional(Schema.Unknown),
		type: Schema.String,
	}),
});

export const SessionScoped = Schema.Struct({ sessionID: Schema.String });

export const SessionStatusProperties = Schema.Struct({
	status: Schema.Struct({ type: Schema.String }),
});

export const SessionErrorProperties = Schema.Struct({
	error: Schema.optional(Schema.Struct({ name: Schema.optional(Schema.String) })),
});
