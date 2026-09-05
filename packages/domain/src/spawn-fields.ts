import { Schema } from "effect";

export const SpawnPayload = Schema.Struct({
	agentId: Schema.String,
	backend: Schema.String,
	charter: Schema.String,
	effort: Schema.optionalKey(Schema.String),
	model: Schema.optionalKey(Schema.String),
	pieceId: Schema.optionalKey(Schema.String),
	role: Schema.String,
	runner: Schema.String,
	sessionId: Schema.String,
	voyageId: Schema.optionalKey(Schema.String),
});

export type SpawnFields = typeof SpawnPayload.Type;
