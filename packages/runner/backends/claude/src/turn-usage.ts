import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import type { RawPayload } from "@antumbra/platform-vocabulary/session-events/raw.ts";

type ResultMessage = Extract<SDKMessage, { type: "result" }>;

interface TurnUsage {
	readonly usage: (raw: RawPayload, message: ResultMessage) => AgentEvent;
}

const modelOf = (message: ResultMessage, sessionModel: string): string => {
	const [answered, ...rest] = Object.keys(message.modelUsage);
	return answered !== undefined && rest.length === 0 ? answered : sessionModel;
};

// `total_cost_usd` is cumulative per query and resets on resume or `/clear`. `usage` token counts are per turn and cover only the main agent loop,
// while cost includes the whole query pipeline.
export const openTurnUsage = (sessionModel: string): TurnUsage => {
	let counted = 0;
	const usage = (raw: RawPayload, message: ResultMessage): AgentEvent => {
		const cumulative = message.total_cost_usd;
		const spent = cumulative < counted ? cumulative : cumulative - counted;
		counted = cumulative;
		return {
			cacheReadTokens: message.usage.cache_read_input_tokens,
			cacheWriteTokens: message.usage.cache_creation_input_tokens,
			costUsd: spent,
			cumulativeCostUsd: cumulative,
			inputTokens: message.usage.input_tokens,
			model: modelOf(message, sessionModel),
			outputTokens: message.usage.output_tokens,
			raw,
			type: "usage",
		};
	};
	return { usage };
};
