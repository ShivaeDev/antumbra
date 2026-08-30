import { Schema } from "effect";

// why: hand-written schemas for the slice of the opencode HTTP API this
// backend consumes, in the shape the server's own OpenAPI document
// (`GET /doc`) describes for the pinned release. Decoding is lenient:
// unknown fields drop and unmodelled frames fall through as raw, because
// the server emits kinds its own document does not list — `server.heartbeat`
// is one it sends on every stream.
export const PINNED_SERVER_VERSION = "1.18.23";

export const SessionResponse = Schema.Struct({
	directory: Schema.String,
	id: Schema.String,
});

// why: every frame on `/global/event` is wrapped, and the wrapper is what
// says which instance spoke. The backend selects by session id rather than by
// directory, so only the payload is modelled here.
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

// why: opencode reports an error against the session rather than against the
// turn it broke, so the shape is deliberately loose — every error variant it
// unions carries a name and nothing else in common.
export const SessionErrorProperties = Schema.Struct({
	error: Schema.optional(
		Schema.Struct({ name: Schema.optional(Schema.String) }),
	),
});
