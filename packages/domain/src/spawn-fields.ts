import { Schema } from "effect";

export const SpawnPayload = Schema.Struct({
	agentId: Schema.String,
	backend: Schema.String,
	charter: Schema.String,
	// why: crew spawned for a piece carries the piece it answers to, so the
	// assignment is written in the same act as the birth; a hand spawned from
	// the fleet view answers to no piece and omits it.
	pieceId: Schema.optionalKey(Schema.String),
	role: Schema.String,
	runner: Schema.String,
	sessionId: Schema.String,
	// why: a captain answers to a voyage rather than to one of its pieces, so
	// the crew row is written in the same act as the birth.
	voyageId: Schema.optionalKey(Schema.String),
});

export type SpawnFields = typeof SpawnPayload.Type;
