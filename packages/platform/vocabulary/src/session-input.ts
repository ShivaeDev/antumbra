import { Schema } from "effect";

export const MAX_SESSION_IMAGES = 4;
export const MAX_SESSION_IMAGE_SOURCE_BYTES = 10 * 1024 * 1024;
export const MAX_SESSION_IMAGE_STORED_BYTES = 3_500_000;
export const MAX_SESSION_INPUT_IMAGE_BYTES = 14_000_000;
export const MAX_SESSION_IMAGE_EDGE = 4096;
export const MAX_SESSION_IMAGE_PIXELS = 16_777_216;

export const SessionInputId = Schema.String.check(Schema.isUUID()).pipe(Schema.brand("SessionInputId"));
export type SessionInputId = typeof SessionInputId.Type;

export const SessionImageMediaType = Schema.Literals(["image/jpeg", "image/png", "image/webp"]);
export type SessionImageMediaType = typeof SessionImageMediaType.Type;

export const SessionInputPosition = Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0));

export const SessionMessagePart = Schema.Union([
	Schema.Struct({ text: Schema.String, type: Schema.Literal("text") }),
	Schema.Struct({
		position: SessionInputPosition,
		type: Schema.Literal("image"),
	}),
]);
export type SessionMessagePart = typeof SessionMessagePart.Type;
