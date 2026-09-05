import { Schema } from "effect";

export const AGENT_ROLES = ["flagship", "captain", "crew", "smoother"] as const;

export const AgentRoleSchema = Schema.Literals(AGENT_ROLES);
export type AgentRole = typeof AgentRoleSchema.Type;

export const VOYAGE_AGENT_ROLES = ["captain", "crew"] as const;

export const VoyageAgentRoleSchema = Schema.Literals(VOYAGE_AGENT_ROLES);
export type VoyageAgentRole = typeof VoyageAgentRoleSchema.Type;
