import type { SDKMessage, ModelUsage as SdkModelUsage } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import type { RawPayload } from "@antumbra/platform-vocabulary/session-events/raw.ts";
import type { ModelUsage } from "@antumbra/platform-vocabulary/session-events/usage.ts";

type ResultMessage = Extract<SDKMessage, { type: "result" }>;

interface TurnUsage {
	readonly usage: (raw: RawPayload, message: ResultMessage) => AgentEvent;
}

interface Counted {
	cacheReadTokens: number;
	cacheWriteTokens: number;
	costUsd: number;
	inputTokens: number;
	outputTokens: number;
}

const zero = (): Counted => ({ cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0, inputTokens: 0, outputTokens: 0 });

const counted = (model: SdkModelUsage): Counted => ({
	cacheReadTokens: model.cacheReadInputTokens,
	cacheWriteTokens: model.cacheCreationInputTokens,
	costUsd: model.costUSD,
	inputTokens: model.inputTokens,
	outputTokens: model.outputTokens,
});

// A running total that went backwards is the counter starting over, so the whole of it belongs to this turn.
const step = (cumulative: number, already: number): number => (cumulative < already ? cumulative : cumulative - already);

const spentSince = (cumulative: Counted, already: Counted): Counted => ({
	cacheReadTokens: step(cumulative.cacheReadTokens, already.cacheReadTokens),
	cacheWriteTokens: step(cumulative.cacheWriteTokens, already.cacheWriteTokens),
	costUsd: step(cumulative.costUsd, already.costUsd),
	inputTokens: step(cumulative.inputTokens, already.inputTokens),
	outputTokens: step(cumulative.outputTokens, already.outputTokens),
});

const moved = (spent: Counted): boolean =>
	spent.cacheReadTokens > 0 || spent.cacheWriteTokens > 0 || spent.costUsd > 0 || spent.inputTokens > 0 || spent.outputTokens > 0;

const add = (total: Counted, spent: Counted): void => {
	total.cacheReadTokens += spent.cacheReadTokens;
	total.cacheWriteTokens += spent.cacheWriteTokens;
	total.costUsd += spent.costUsd;
	total.inputTokens += spent.inputTokens;
	total.outputTokens += spent.outputTokens;
};

// `total_cost_usd` and `modelUsage` are both cumulative per query and reset on resume or `/clear`, so a turn's own share of either is the step from
// the last result. `modelUsage` covers the whole query pipeline, which the result's own `usage` does not, and is what the provider prices a turn by.
export const openTurnUsage = (): TurnUsage => {
	const already = new Map<string, Counted>();
	const usage = (raw: RawPayload, message: ResultMessage): AgentEvent => {
		const byModel: Array<ModelUsage> = [];
		const total = zero();
		for (const [key, model] of Object.entries(message.modelUsage)) {
			const cumulative = counted(model);
			const spent = spentSince(cumulative, already.get(key) ?? zero());
			already.set(key, cumulative);
			if (moved(spent)) {
				byModel.push({ ...spent, model: model.canonicalModel ?? key });
				add(total, spent);
			}
		}
		return { ...total, byModel, cumulativeCostUsd: message.total_cost_usd, raw, type: "usage" };
	};
	return { usage };
};
