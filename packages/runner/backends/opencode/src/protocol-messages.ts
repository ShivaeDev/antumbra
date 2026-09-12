import { Schema } from "effect";

export const MessageUpdatedProperties = Schema.Struct({
	info: Schema.Struct({
		id: Schema.String,
		modelID: Schema.optional(Schema.String),
		providerID: Schema.optional(Schema.String),
		role: Schema.Literals(["assistant", "user"]),
	}),
});
