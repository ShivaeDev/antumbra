import { Schema } from "effect";

// why: domain recovery and artifact ownership read these same durable runtime
// words. This package is a leaf so neither capability can widen the vocabulary
// or make the other import its implementation.
export const AgentStatusSchema = Schema.Literals([
	"spawning",
	"alive",
	"dormant",
	"retired",
]);
export type AgentStatus = typeof AgentStatusSchema.Type;

export const AgentSessionStatusSchema = Schema.Literals(["open", "closed"]);
export type AgentSessionStatus = typeof AgentSessionStatusSchema.Type;

export const MoorageStatusSchema = Schema.Literals(["provisioning", "ready"]);
export type MoorageStatus = typeof MoorageStatusSchema.Type;

export const BerthStatusSchema = Schema.Literals([
	"provisioning",
	"ready",
	"stranded",
	"reclaimed",
]);
export type BerthStatus = typeof BerthStatusSchema.Type;

export const ResourceReclaimStateSchema = Schema.Literal("claimed");
export type ResourceReclaimState = typeof ResourceReclaimStateSchema.Type;
