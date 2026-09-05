import { MAX_SESSION_IMAGES, MAX_SESSION_INPUT_IMAGE_BYTES } from "@antumbra/vocabulary/session-input";
import { Effect } from "effect";
import { normalizeImage } from "#adapters/normalize.ts";
import { digestRequest } from "#digest.ts";
import { SessionInputInvalid } from "#errors.ts";
import type { PreparedSessionInput, PreparedSessionInputPart, SessionInputDraft, SessionInputDraftPart } from "#model.ts";

const displayName = (value: string): string => {
	const cleaned = Array.from(value)
		.map((character) => {
			const code = character.charCodeAt(0);
			return code < 32 || code === 127 || character === "/" || character === "\\" ? " " : character;
		})
		.join("")
		.replace(/\s+/g, " ")
		.trim();
	return (cleaned === "" ? "attached image" : cleaned).slice(0, 120);
};

const preparePart = (part: SessionInputDraftPart, position: number): Effect.Effect<PreparedSessionInputPart, SessionInputInvalid> => {
	if (part.type === "text") {
		return part.text.trim() === ""
			? Effect.fail(
					new SessionInputInvalid({
						detail: `text part ${position + 1} is blank`,
						reason: "empty_text",
					}),
				)
			: Effect.succeed({ text: part.text, type: "text" });
	}
	return normalizeImage(part.bytes).pipe(
		Effect.map((image) => ({
			image,
			name: displayName(part.name),
			type: "image" as const,
		})),
		Effect.mapError(
			(failure) =>
				new SessionInputInvalid({
					detail: `image ${position + 1}: ${failure.detail}`,
					reason: failure.reason,
				}),
		),
	);
};

export const prepareInput = Effect.fn("SessionInputs.prepareInput")(function* (
	draft: SessionInputDraft,
): Effect.fn.Return<PreparedSessionInput, SessionInputInvalid> {
	const firstText = draft.parts.findIndex((part) => part.type === "text");
	const textCount = draft.parts.filter((part) => part.type === "text").length;
	if (textCount > 1 || (firstText >= 0 && draft.parts.slice(firstText + 1).some((part) => part.type === "image"))) {
		return yield* new SessionInputInvalid({
			detail: "images must come first in display order, followed by at most one text part",
			reason: "invalid_order",
		});
	}
	const imageCount = draft.parts.filter((part) => part.type === "image").length;
	if (imageCount > MAX_SESSION_IMAGES) {
		return yield* new SessionInputInvalid({
			detail: `${imageCount} images exceeds the ${MAX_SESSION_IMAGES} image limit`,
			reason: "too_many_images",
		});
	}
	const parts = yield* Effect.forEach(draft.parts, preparePart);
	const imageBytes = parts.reduce((total, part) => total + (part.type === "image" ? part.image.bytes.length : 0), 0);
	if (imageBytes > MAX_SESSION_INPUT_IMAGE_BYTES) {
		return yield* new SessionInputInvalid({
			detail: `${imageBytes} normalized bytes exceeds the ${MAX_SESSION_INPUT_IMAGE_BYTES} byte input limit`,
			reason: "input_too_large",
		});
	}
	return {
		id: draft.id,
		parts,
		requestDigest: digestRequest(draft.sessionId, draft.parts),
		sessionId: draft.sessionId,
	};
});
