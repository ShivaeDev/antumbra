import { Effect } from "effect";
import sharp from "sharp";
import { SessionInputCustodyFailed } from "#errors.ts";

const EDGE = 1024;

export const transcriptThumbnail = (
	bytes: Uint8Array,
): Effect.Effect<Uint8Array, SessionInputCustodyFailed> =>
	Effect.tryPromise({
		catch: (_cause) =>
			new SessionInputCustodyFailed({
				detail: "the transcript thumbnail could not be generated",
			}),
		try: async () =>
			new Uint8Array(
				await sharp(bytes, { failOn: "error" })
					.resize({
						fit: "inside",
						height: EDGE,
						width: EDGE,
						withoutEnlargement: true,
					})
					.webp({ effort: 4, quality: 80 })
					.toBuffer(),
			),
	});
