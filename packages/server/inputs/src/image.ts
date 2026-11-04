import { InputNotFound } from "@antumbra/domain-inputs/commands/errors.ts";
import type { ImageRequest } from "@antumbra/platform-vocabulary/inputs.ts";
import { Effect } from "effect";
import { readImage } from "#adapters/custody.ts";
import { transcriptThumbnail } from "#adapters/thumbnail.ts";
import { reading } from "#queries/reading.ts";
import { InputStorage } from "#storage.ts";

export const image = Effect.fn("Inputs.image")(function* (request: ImageRequest) {
	const held = yield* reading({ sessionId: request.sessionId, id: request.inputId });
	const part = held?.parts[request.position];
	if (part === undefined || part.type !== "image") return yield* new InputNotFound({ inputId: request.inputId });
	const bytes = yield* readImage((yield* InputStorage).root, part.attachment.digest, part.attachment.mediaType);
	return { bytes: yield* transcriptThumbnail(bytes), mediaType: "image/webp" as const, name: part.name };
});
