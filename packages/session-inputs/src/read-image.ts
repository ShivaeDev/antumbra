import { Database } from "@antumbra/persistence";
import { SessionImageMediaType, type SessionInputId } from "@antumbra/vocabulary/session-input.ts";
import { Effect, Option, Schema } from "effect";
import { readImage } from "#adapters/custody.ts";
import { transcriptThumbnail } from "#adapters/thumbnail.ts";
import { SessionInputNotFound, StoredSessionInputInvalid } from "#errors.ts";
import type { SessionInputImage } from "#model.ts";
import { StorageRoot } from "#storage-root.ts";
import { requireInput } from "#stored.ts";

const decodeMediaType = Schema.decodeUnknownOption(SessionImageMediaType);
const invalid = (inputId: string, detail: string) => new StoredSessionInputInvalid({ detail, inputId });

export const readStoredImage = Effect.fn("SessionInputs.image")(function* (request: {
	readonly inputId: SessionInputId;
	readonly position: number;
	readonly sessionId: string;
}) {
	const db = yield* Database;
	const root = yield* StorageRoot;
	const input = yield* requireInput(request.inputId);
	if (input.sessionId !== request.sessionId) {
		return yield* new SessionInputNotFound({ inputId: request.inputId });
	}
	const part = yield* db.SessionInputPart.where({
		inputId: request.inputId,
		position: request.position,
	}).first();
	if (Option.isNone(part) || part.value.kind !== "image") {
		return yield* new SessionInputNotFound({ inputId: request.inputId });
	}
	const { attachmentId, displayName } = part.value;
	if (attachmentId === null || displayName === null) {
		return yield* invalid(request.inputId, "image part has no attachment metadata");
	}
	const attachment = yield* db.SessionAttachment.where({
		id: attachmentId,
	}).first();
	if (Option.isNone(attachment)) {
		return yield* invalid(request.inputId, "image attachment is missing");
	}
	const mediaType = decodeMediaType(attachment.value.mediaType);
	if (Option.isNone(mediaType)) {
		return yield* invalid(request.inputId, "image attachment media type is invalid");
	}
	const bytes = yield* readImage(root, attachment.value.digest, mediaType.value);
	return {
		bytes: yield* transcriptThumbnail(bytes),
		mediaType: "image/webp",
		name: displayName,
	} satisfies SessionInputImage;
});
