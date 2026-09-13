import { UsageEvent } from "@antumbra/platform-vocabulary/session-events/usage.ts";
import { Schema } from "effect";

export const UsageEvidence = Schema.Struct({
	byModel: UsageEvent.fields.byModel,
	cacheReadTokens: UsageEvent.fields.cacheReadTokens,
	cacheWriteTokens: UsageEvent.fields.cacheWriteTokens,
	costUsd: UsageEvent.fields.costUsd,
	cumulativeCostUsd: UsageEvent.fields.cumulativeCostUsd,
	inputTokens: UsageEvent.fields.inputTokens,
	outputTokens: UsageEvent.fields.outputTokens,
});
export type UsageEvidence = typeof UsageEvidence.Type;
