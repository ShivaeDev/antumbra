import type { Draft } from "@antumbra/domain-inputs/schema.ts";
import type { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect, Schema } from "effect";
import type { DraftImage } from "#session-draft.ts";
export class InputFileReadFailed extends Schema.TaggedError<InputFileReadFailed>()("InputFileReadFailed", { detail: Schema.String }) {}
export const inputRequest = Effect.fn("inputs.inputRequest")(function* (
	sessionId: string,
	id: SessionInputId,
	images: readonly DraftImage[],
	text: string,
) {
	const imageParts = yield* Effect.forEach(images, ({ file }) =>
		Effect.tryPromise({
			try: () => file.arrayBuffer(),
			catch: () => new InputFileReadFailed({ detail: "The selected image could not be read" }),
		}).pipe(
			Effect.map((bytes) => ({
				type: "image" as const,
				bytes: new Uint8Array(bytes),
				name: file.name || "pasted image",
				...(file.type === "" ? {} : { declaredMediaType: file.type }),
			})),
		),
	);
	const parts = [...imageParts, ...(text.trim() === "" ? [] : [{ type: "text" as const, text }])];
	const [first, ...rest] = parts;
	if (first === undefined) return yield* new InputFileReadFailed({ detail: "Add words or an image before sending" });
	return { id, sessionId, parts: [first, ...rest] } satisfies Draft;
});
