import { Schema } from "effect";

export const AgentStatusSchema = Schema.Literals(["spawning", "alive", "dormant", "retired"]);
export type AgentStatus = typeof AgentStatusSchema.Type;

export const AgentSessionStatusSchema = Schema.Literals(["open", "closed"]);
export type AgentSessionStatus = typeof AgentSessionStatusSchema.Type;

// Retained for rows created before completeness tracking.
export const AgentSessionCompletenessSchema = Schema.Literals(["recording", "complete", "incomplete", "unaudited"]);
export type AgentSessionCompleteness = typeof AgentSessionCompletenessSchema.Type;

export const MoorageStatusSchema = Schema.Literals(["provisioning", "ready"]);
export type MoorageStatus = typeof MoorageStatusSchema.Type;

export const BerthStatusSchema = Schema.Literals(["provisioning", "ready", "stranded", "reclaimed"]);
export type BerthStatus = typeof BerthStatusSchema.Type;

export const ResourceReclaimStateSchema = Schema.Literal("claimed");
export type ResourceReclaimState = typeof ResourceReclaimStateSchema.Type;
