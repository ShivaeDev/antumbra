import { SessionImageMediaType, SessionInputId, SessionInputPosition } from "@antumbra/platform-vocabulary/session-input.ts";
import { Schema } from "effect";

export const DraftPart = Schema.Union([
	Schema.Struct({ type: Schema.Literal("text"), text: Schema.String }),
	Schema.Struct({ type: Schema.Literal("image"), bytes: Schema.Uint8Array, name: Schema.String, declaredMediaType: Schema.optional(Schema.String) }),
]);
export const Draft = Schema.Struct({ id: SessionInputId, sessionId: Schema.String, parts: Schema.NonEmptyArray(DraftPart) });
export type Draft = typeof Draft.Type;
export const Attachment = Schema.Struct({
	id: Schema.String,
	digest: Schema.String,
	mediaType: SessionImageMediaType,
	byteSize: Schema.Number,
	width: Schema.Number,
	height: Schema.Number,
});
export type Attachment = typeof Attachment.Type;
export const Part = Schema.Union([
	Schema.Struct({ type: Schema.Literal("text"), text: Schema.String }),
	Schema.Struct({ type: Schema.Literal("image"), attachment: Attachment, name: Schema.String }),
]);
export const Prepared = Schema.Struct({
	id: SessionInputId,
	sessionId: Schema.String,
	requestDigest: Schema.String,
	parts: Schema.NonEmptyArray(Part),
});
export type Prepared = typeof Prepared.Type;
export const DeliveryStatus = Schema.Literals(["pending", "queued_for_wake", "accepted", "ambiguous", "refused"]);
export const Receipt = Schema.Struct({ id: SessionInputId, status: Schema.Literals(["accepted", "queued_for_wake"]) });
export type Receipt = typeof Receipt.Type;
export const ImageRequest = Schema.Struct({ sessionId: Schema.String, inputId: SessionInputId, position: SessionInputPosition });
export type ImageRequest = typeof ImageRequest.Type;
export const Image = Schema.Struct({ bytes: Schema.Uint8Array, mediaType: SessionImageMediaType, name: Schema.String });
export type Image = typeof Image.Type;
