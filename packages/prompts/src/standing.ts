import { type AgentPrompt, agentPrompt } from "#mint.ts";

// why: Antumbra recovers a Session on its own initiative, so nobody typed
// anything and there is no blank to fill — the words are the same every time
// and an input struct would describe a template that has no inputs. What a
// resumed Agent needs is where the truth is and what to do with it; the rest
// it reads out of its own record.
export const standingRecovery: AgentPrompt = agentPrompt(
	"Reconcile durable Antumbra truth and continue your assigned work.",
);
