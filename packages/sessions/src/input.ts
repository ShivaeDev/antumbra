import type { SessionInput } from "@antumbra/plugin-api";
import { admiralWords } from "@antumbra/prompts/admiral.ts";
import type { AgentPrompt } from "@antumbra/prompts/mint.ts";

export const promptInput = (prompt: AgentPrompt): SessionInput => ({
	parts: [{ text: prompt, type: "text" }],
});

export const admiralInput = (input: SessionInput): SessionInput => {
	const admit = (part: SessionInput["parts"][number]) =>
		part.type === "text" ? { text: admiralWords({ words: part.text }), type: "text" as const } : part;
	return {
		id: input.id,
		parts: [admit(input.parts[0]), ...input.parts.slice(1).map(admit)],
	};
};
