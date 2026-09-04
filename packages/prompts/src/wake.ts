import { type AgentPrompt, agentPrompt } from "#mint.ts";

export const wakeWords: AgentPrompt = agentPrompt(
	"You are being woken as the same Agent. Read the current work, standing rulings and board notes before continuing your assigned responsibility in light of the admiral's latest direction.",
);
