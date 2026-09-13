import { type AgentPrompt, agentPrompt } from "#mint.ts";

export const hailWords: AgentPrompt = agentPrompt(
	"You were hailed to take your voyage back up. Check current outcomes, rulings and board notes before continuing.",
);
