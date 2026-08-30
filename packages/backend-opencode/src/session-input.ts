import type { BackendFailure, SessionInput } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { opencodeFailure } from "#failure.ts";

export const textOnly = (input: SessionInput): Effect.Effect<string, BackendFailure> => {
	const texts = input.parts.flatMap((part) => (part.type === "text" ? [part.text] : []));
	return texts.length === input.parts.length
		? Effect.succeed(texts.join("\n"))
		: Effect.fail(opencodeFailure("image input is not enabled for the opencode backend"));
};
