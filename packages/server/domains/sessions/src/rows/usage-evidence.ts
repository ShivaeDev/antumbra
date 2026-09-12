import { UsageEvent } from "@antumbra/platform-vocabulary/session-events/usage.ts";
import { Schema } from "effect";

export const UsageEvidence = Schema.Struct({
	cacheReadTokens: UsageEvent.fields.cacheReadTokens,
	cacheWriteTokens: UsageEvent.fields.cacheWriteTokens,
	costUsd: UsageEvent.fields.costUsd,
	cumulativeCostUsd: UsageEvent.fields.cumulativeCostUsd,
	inputTokens: UsageEvent.fields.inputTokens,
	outputTokens: UsageEvent.fields.outputTokens,
	model: UsageEvent.fields.model,
});
export type UsageEvidence = typeof UsageEvidence.Type;
