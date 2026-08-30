import { Schema } from "effect";

export const AgentStatusSchema = Schema.Literals(["spawning", "alive", "dormant", "retired"]);
export type AgentStatus = typeof AgentStatusSchema.Type;

export const AgentSessionStatusSchema = Schema.Literals(["open", "closed"]);
export type AgentSessionStatus = typeof AgentSessionStatusSchema.Type;

// why: a Session node resumes, so its completeness is a state rather than a
// bit. A node opens — or resumes, from any state — into "recording"; the
// close-time audit lands "complete" when its gap set is empty and "incomplete"
// when gaps were journaled; repair may re-audit an incomplete node back to
// "complete". "unaudited" is legacy backfill only: rows that closed before gap
// tracking existed, whose completeness was never examined.
export const AgentSessionCompletenessSchema = Schema.Literals(["recording", "complete", "incomplete", "unaudited"]);
export type AgentSessionCompleteness = typeof AgentSessionCompletenessSchema.Type;

export const MoorageStatusSchema = Schema.Literals(["provisioning", "ready"]);
export type MoorageStatus = typeof MoorageStatusSchema.Type;

export const BerthStatusSchema = Schema.Literals(["provisioning", "ready", "stranded", "reclaimed"]);
export type BerthStatus = typeof BerthStatusSchema.Type;

export const ResourceReclaimStateSchema = Schema.Literal("claimed");
export type ResourceReclaimState = typeof ResourceReclaimStateSchema.Type;
