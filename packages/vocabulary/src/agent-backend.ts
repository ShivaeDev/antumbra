import { Schema } from "effect";

export const AGENT_BACKEND_TAGS = ["claude", "codex"] as const;

export const AgentBackendTagSchema = Schema.Literals(AGENT_BACKEND_TAGS);
export type AgentBackendTag = typeof AgentBackendTagSchema.Type;
