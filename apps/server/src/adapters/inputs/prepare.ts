import { type ImageUnavailable, InvalidInput } from "@antumbra/domain-inputs/errors.ts";
import type { Draft, Prepared } from "@antumbra/domain-inputs/schema.ts";
import { MAX_SESSION_IMAGES, MAX_SESSION_INPUT_IMAGE_BYTES } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect } from "effect";
import { publishImage } from "#adapters/inputs/custody.ts";
import { digestRequest } from "#adapters/inputs/digest.ts";
import { normalizeImage } from "#adapters/inputs/normalize.ts";

type NormalizedPart =
	| { readonly type: "text"; readonly text: string }
	| { readonly type: "image"; readonly image: Effect.Success<ReturnType<typeof normalizeImage>>; readonly name: string };

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
export const prepare = Effect.fn("inputs.prepare")(function* (root: string, draft: Draft) {
	const firstText = draft.parts.findIndex((part) => part.type === "text");
	const text = draft.parts.filter((part) => part.type === "text");
	if (text.some((part) => part.text.trim() === "")) return yield* new InvalidInput({ reason: "empty_text", detail: "text is blank" });
	if (text.length > 1 || (firstText >= 0 && draft.parts.slice(firstText + 1).some((part) => part.type === "image")))
		return yield* new InvalidInput({ reason: "invalid_order", detail: "images must come first in display order, followed by at most one text part" });
	if (draft.parts.filter((part) => part.type === "image").length > MAX_SESSION_IMAGES)
		return yield* new InvalidInput({ reason: "too_many_images", detail: "no more than four images may be attached" });
	const normalized = yield* Effect.forEach(
		draft.parts,
		(part): Effect.Effect<NormalizedPart, InvalidInput> =>
			part.type === "text"
				? Effect.succeed(part)
				: normalizeImage(part.bytes).pipe(Effect.map((image) => ({ type: "image" as const, image, name: displayName(part.name) }))),
	);
	if (normalized.reduce((size, part) => size + (part.type === "image" ? part.image.bytes.length : 0), 0) > MAX_SESSION_INPUT_IMAGE_BYTES)
		return yield* new InvalidInput({ reason: "input_too_large", detail: "normalized image bytes exceed the input limit" });
	const parts = yield* Effect.forEach(
		normalized,
		(part): Effect.Effect<Prepared["parts"][number], ImageUnavailable> =>
			part.type === "text"
				? Effect.succeed(part)
				: publishImage(root, part.image.digest, part.image.mediaType, part.image.bytes).pipe(
						Effect.as({
							type: "image" as const,
							name: part.name,
							attachment: {
								id: part.image.digest,
								digest: part.image.digest,
								mediaType: part.image.mediaType,
								byteSize: part.image.bytes.length,
								width: part.image.width,
								height: part.image.height,
							},
						}),
					),
	);
	const [first, ...rest] = parts;
	if (first === undefined) return yield* Effect.die(new Error("decoded input has no parts"));
	return {
		id: draft.id,
		sessionId: draft.sessionId,
		requestDigest: digestRequest(draft.sessionId, draft.parts),
		parts: [first, ...rest],
	} satisfies Prepared;
});
