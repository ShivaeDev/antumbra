import { SessionImageMediaType, SessionInputId, SessionInputPosition } from "@antumbra/vocabulary/session-input";
import { Schema } from "effect";

// why: what the admiral hands a Session crosses the boundary as bytes with a
// name and nothing decided about it yet, and comes back as a picture the window
// can show. Those are two different shapes of the same attachment, so they are
// declared together and away from the surface that merely carries them.
export const SessionInputDraftPart = Schema.Union([
	Schema.Struct({ text: Schema.String, type: Schema.Literal("text") }),
	Schema.Struct({
		bytes: Schema.Uint8Array,
		declaredMediaType: Schema.optional(Schema.String),
		name: Schema.String,
		type: Schema.Literal("image"),
	}),
]);
export type SessionInputDraftPart = typeof SessionInputDraftPart.Type;

export const SessionInputRequest = Schema.Struct({
	id: SessionInputId,
	parts: Schema.NonEmptyArray(SessionInputDraftPart),
	sessionId: Schema.String,
});
export type SessionInputRequest = typeof SessionInputRequest.Type;

export const SessionInputReceipt = Schema.Struct({
	id: SessionInputId,
	status: Schema.Literals(["accepted", "queued_for_wake"]),
});
export type SessionInputReceipt = typeof SessionInputReceipt.Type;

export const SessionImageRequest = Schema.Struct({
	inputId: SessionInputId,
	position: SessionInputPosition,
	sessionId: Schema.String,
});
export type SessionImageRequest = typeof SessionImageRequest.Type;

export const SessionImage = Schema.Struct({
	bytes: Schema.Uint8Array,
	mediaType: SessionImageMediaType,
	name: Schema.String,
});
export type SessionImage = typeof SessionImage.Type;
