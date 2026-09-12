import { Schema } from "effect";

// A cost is null where no contributing turn reported one, and partial where some did and some did not.
export const UsageTotal = Schema.Struct({
	cacheReadTokens: Schema.Number,
	cacheWriteTokens: Schema.Number,
	costPartial: Schema.Boolean,
	costUsd: Schema.NullOr(Schema.Number),
	inputTokens: Schema.Number,
	outputTokens: Schema.Number,
	turns: Schema.Number,
});
export type UsageTotal = typeof UsageTotal.Type;

export const AgentSpend = Schema.Struct({
	agentId: Schema.String,
	sessionIds: Schema.Array(Schema.String),
	total: UsageTotal,
});
export type AgentSpend = typeof AgentSpend.Type;

export const VoyageSpend = Schema.Struct({
	name: Schema.String,
	total: UsageTotal,
	voyageId: Schema.String,
});
export type VoyageSpend = typeof VoyageSpend.Type;

export const ModelSpend = Schema.Struct({
	model: Schema.NullOr(Schema.String),
	total: UsageTotal,
});
export type ModelSpend = typeof ModelSpend.Type;

export const BackendSpend = Schema.Struct({
	backend: Schema.String,
	total: UsageTotal,
});
export type BackendSpend = typeof BackendSpend.Type;

export const DaySpend = Schema.Struct({
	backends: Schema.Array(BackendSpend),
	day: Schema.String,
});
export type DaySpend = typeof DaySpend.Type;

export const CostsView = Schema.Struct({
	agents: Schema.Array(AgentSpend),
	days: Schema.Array(DaySpend),
	models: Schema.Array(ModelSpend),
	total: UsageTotal,
	unassigned: UsageTotal,
	voyages: Schema.Array(VoyageSpend),
});
export type CostsView = typeof CostsView.Type;
