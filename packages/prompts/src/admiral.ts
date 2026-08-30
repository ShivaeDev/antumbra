import { Schema } from "effect";
import { type AgentPrompt, agentPrompt } from "#mint.ts";

export const AdmiralWords = Schema.Struct({
	words: Schema.String,
});
export type AdmiralWords = typeof AdmiralWords.Type;

// why: the one template with nothing of its own to say. Everything else an
// Agent hears is written in this package; what the admiral types is theirs and
// passes through unchanged. It is a named template rather than a seam that
// quietly accepts a bare string, so the exception is one entry in the catalog
// instead of a hole in it.
export const admiralWords = (input: AdmiralWords): AgentPrompt => agentPrompt(input.words);
