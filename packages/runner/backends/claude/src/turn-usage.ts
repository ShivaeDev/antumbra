import type { ModelUsage, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import type { RawPayload } from "@antumbra/platform-vocabulary/session-events/raw.ts";

type ResultMessage = Extract<SDKMessage, { type: "result" }>;

interface TurnUsage {
	readonly usage: (raw: RawPayload, message: ResultMessage) => AgentEvent;
}

const tokensOf = (model: ModelUsage): number => model.inputTokens + model.outputTokens + model.cacheReadInputTokens + model.cacheCreationInputTokens;

// `total_cost_usd` and `modelUsage` are both cumulative per query and reset on resume or `/clear`, so a turn's own share of either is the step from
// the last result. `usage` token counts are per turn and cover only the main agent loop, while cost covers the whole query pipeline.
export const openTurnUsage = (sessionModel: string): TurnUsage => {
	let countedCost = 0;
	const countedTokens = new Map<string, number>();
	const modelOf = (message: ResultMessage): string => {
		let named = sessionModel;
		let busiest = 0;
		for (const [key, model] of Object.entries(message.modelUsage)) {
			const cumulative = tokensOf(model);
			const counted = countedTokens.get(key) ?? 0;
			const spent = cumulative < counted ? cumulative : cumulative - counted;
			countedTokens.set(key, cumulative);
			if (spent > busiest) {
				busiest = spent;
				named = model.canonicalModel ?? key;
			}
		}
		return named;
	};
	const usage = (raw: RawPayload, message: ResultMessage): AgentEvent => {
		const cumulative = message.total_cost_usd;
		const spent = cumulative < countedCost ? cumulative : cumulative - countedCost;
		countedCost = cumulative;
		return {
			cacheReadTokens: message.usage.cache_read_input_tokens,
			cacheWriteTokens: message.usage.cache_creation_input_tokens,
			costUsd: spent,
			cumulativeCostUsd: cumulative,
			inputTokens: message.usage.input_tokens,
			model: modelOf(message),
			outputTokens: message.usage.output_tokens,
			raw,
			type: "usage",
		};
	};
	return { usage };
};
