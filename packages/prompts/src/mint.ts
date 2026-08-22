import { Brand } from "effect";

// why: the brand carries no data. It is the compile-time record that a string
// was written by a template in this package, so a seam that hands words to an
// Agent can name what it accepts and refuse prose assembled anywhere else.
export type AgentPrompt = string & Brand.Brand<"AgentPrompt">;

// why: the mint is package-private by construction — the manifest exports only
// the catalog entry, so no other package can resolve this module and no other
// package can turn a string into words an Agent may hear.
export const agentPrompt = Brand.nominal<AgentPrompt>();
