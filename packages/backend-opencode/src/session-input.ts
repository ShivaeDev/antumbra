import type { BackendFailure, SessionInput } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { opencodeFailure } from "#failure.ts";

// why: opencode takes file parts on a prompt and could carry an image, but no
// session here has ever sent one. The capability stays unclaimed until that
// path is exercised, and an image offered to a backend that never proved it
// is refused rather than quietly dropped from the words around it.
export const textOnly = (
	input: SessionInput,
): Effect.Effect<string, BackendFailure> => {
	const texts = input.parts.flatMap((part) =>
		part.type === "text" ? [part.text] : [],
	);
	return texts.length === input.parts.length
		? Effect.succeed(texts.join("\n"))
		: Effect.fail(
				opencodeFailure("image input is not enabled for the opencode backend"),
			);
};
