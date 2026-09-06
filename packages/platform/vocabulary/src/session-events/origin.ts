import { Schema } from "effect";

// Optional attribution keeps rows written before it was added readable; node disambiguates providers that fan out one call.
export const Origin = Schema.Struct({
	node: Schema.optional(Schema.String),
	parentNode: Schema.optional(Schema.String),
	spawnedBy: Schema.String,
});
export type Origin = typeof Origin.Type;
