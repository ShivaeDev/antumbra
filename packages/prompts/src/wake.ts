import { type AgentPrompt, agentPrompt } from "#mint.ts";

// why: a wake may arrive with nothing to say — a hail addresses an Agent rather
// than carrying a message, and a Session resumed to take up a Piece already
// assigned to it is answered by its own record. Nobody typed anything, so there
// is no blank to fill and an input struct would describe a template that has no
// inputs. What a woken Agent needs is where the truth is and what to do with
// it; the rest it reads out of its own record.
export const wakeWords: AgentPrompt = agentPrompt("Reconcile durable Antumbra truth and continue your assigned work.");
