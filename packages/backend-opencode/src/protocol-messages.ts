import { Schema } from "effect";

// why: the message envelope, split from the part schemas so each file stays
// one readable page. Only the fields the projection reads are modelled: who
// spoke and which model answered. Everything else about a message reaches the
// record through its parts.
export const MessageUpdatedProperties = Schema.Struct({
	info: Schema.Struct({
		id: Schema.String,
		modelID: Schema.optional(Schema.String),
		providerID: Schema.optional(Schema.String),
		role: Schema.Literals(["assistant", "user"]),
	}),
});
