import { Schema } from "effect";

// why: the agent backends this app ships. A voyage points its future spawns at
// one of them, so a name outside this set names nothing the host could ever
// open a session against — it is refused where it enters rather than at the
// spawn that could never have honoured it.
export const AGENT_BACKEND_TAGS = ["claude", "codex"] as const;

export const AgentBackendTagSchema = Schema.Literals(AGENT_BACKEND_TAGS);
export type AgentBackendTag = typeof AgentBackendTagSchema.Type;
