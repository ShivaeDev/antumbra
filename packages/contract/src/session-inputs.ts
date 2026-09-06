import { SessionImageMediaType, SessionInputId, SessionInputPosition } from "@antumbra/vocabulary/session-input.ts";
import { Schema } from "effect";

const SessionInputDraftPart = Schema.Union([
	Schema.Struct({ text: Schema.String, type: Schema.Literal("text") }),
	Schema.Struct({
		bytes: Schema.Uint8Array,
		declaredMediaType: Schema.optional(Schema.String),
		name: Schema.String,
		type: Schema.Literal("image"),
	}),
]);
type SessionInputDraftPart = typeof SessionInputDraftPart.Type;

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
