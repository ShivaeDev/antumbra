import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type {
	AgentEvent,
	RawPayload,
} from "@antumbra/vocabulary/session-events";

type ResultMessage = Extract<SDKMessage, { type: "result" }>;

export interface TurnUsage {
	readonly usage: (raw: RawPayload, message: ResultMessage) => AgentEvent;
}

// why: `modelUsage` is keyed by every model the query pipeline called, so one
// key is the model that answered and several is a turn no single name is true
// of. Naming one of several would put a wrong model beside the right numbers.
const modelOf = (message: ResultMessage): string | undefined => {
	const [model, ...rest] = Object.keys(message.modelUsage);
	return rest.length === 0 ? model : undefined;
};

// why: `total_cost_usd` is the running total for the whole query() call, never
// the turn's share — reading it as the turn's is what made every turn in this
// record look like it cost the whole session. The step is taken here, against
// the previous result frame, because this reader's life is that same query()'s:
// the SDK resets the counter when a session is resumed, and a mapping is opened
// on the same attach. A total that came back smaller than the last one is that
// reset (a resume, a mid-session /clear), and then the total *is* the step —
// which beats reporting a turn that earned money.
//
// why: the four token counts come from `usage`, the one field the SDK
// documents as per-turn. It covers the main agent loop only, while the cost
// beside it covers everything the query pipeline spent, subagents included —
// so a turn that delegated heavily shows more cost than its own tokens explain.
export const openTurnUsage = (): TurnUsage => {
	let counted = 0;
	const usage = (raw: RawPayload, message: ResultMessage): AgentEvent => {
		const cumulative = message.total_cost_usd;
		const spent = cumulative < counted ? cumulative : cumulative - counted;
		const model = modelOf(message);
		counted = cumulative;
		return {
			cacheReadTokens: message.usage.cache_read_input_tokens,
			cacheWriteTokens: message.usage.cache_creation_input_tokens,
			costUsd: spent,
			cumulativeCostUsd: cumulative,
			inputTokens: message.usage.input_tokens,
			...(model === undefined ? {} : { model }),
			outputTokens: message.usage.output_tokens,
			raw,
			type: "usage",
		};
	};
	return { usage };
};
