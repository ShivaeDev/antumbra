import { Schema } from "effect";
import { type AgentPrompt, agentPrompt } from "#mint.ts";

export const AdmiralWords = Schema.Struct({
	words: Schema.String,
});
export type AdmiralWords = typeof AdmiralWords.Type;

export const admiralWords = (input: AdmiralWords): AgentPrompt => agentPrompt(input.words);
