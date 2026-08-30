import { Schema } from "effect";

export const SessionResponse = Schema.Struct({
	directory: Schema.String,
	id: Schema.String,
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
