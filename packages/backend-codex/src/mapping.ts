import type { AgentEvent, RawPayload } from "@antumbra/vocabulary/session-events.ts";
import { Option, Schema } from "effect";
import type { RpcNotification } from "#adapters/rpc.ts";
import { itemCompleted, itemStarted } from "#items.ts";
import { ItemNotification, TokenUsageNotification, TurnNotification } from "#protocol.ts";
import { RATE_LIMITS_METHOD, rateLimitEvents } from "#rate-limits.ts";
import { threadStateEvents } from "#thread-state.ts";

const decodeTurn = Schema.decodeUnknownOption(TurnNotification);
const decodeUsage = Schema.decodeUnknownOption(TokenUsageNotification);
const decodeItem = Schema.decodeUnknownOption(ItemNotification);

export const rawOf = (kind: string, payload: unknown): RawPayload => ({
	kind,
	payload: JSON.stringify(payload),
	source: "codex",
});

const turnStatus = (status: typeof TurnNotification.Type.turn.status): "completed" | "failed" | "interrupted" =>
	status === "inProgress" ? "completed" : status;

// Codex turn notifications mark turn boundaries; status notifications carry waiting flags.
const turnStarted = (raw: RawPayload, params: unknown): AgentEvent[] =>
	Option.isNone(decodeTurn(params)) ? [{ raw, type: "raw" }] : [{ raw, state: "running", type: "session.state" }];

const turnCompleted = (raw: RawPayload, params: unknown): AgentEvent[] =>
	Option.match(decodeTurn(params), {
		onNone: () => [{ raw, type: "raw" }],
		onSome: ({ turn }) => [
			{
				...(turn.durationMs === null || turn.durationMs === undefined ? {} : { durationMs: turn.durationMs }),
				raw,
				status: turnStatus(turn.status),
				type: "turn.completed",
			},
			{ raw, state: "idle", type: "session.state" },
		],
	});

const tokenUsage = (raw: RawPayload, params: unknown): AgentEvent[] =>
	Option.match(decodeUsage(params), {
		onNone: () => [{ raw, type: "raw" }],
		// Codex reports per-round usage in `last`; cost fields are not present.
		onSome: ({ tokenUsage }) => [
			{
				cacheReadTokens: tokenUsage.last.cachedInputTokens,
				...(tokenUsage.last.cacheWriteInputTokens === undefined ? {} : { cacheWriteTokens: tokenUsage.last.cacheWriteInputTokens }),
				inputTokens: tokenUsage.last.inputTokens,
				outputTokens: tokenUsage.last.outputTokens,
				raw,
				type: "usage",
			},
		],
	});

const itemEvents = (raw: RawPayload, params: unknown, project: typeof itemStarted): AgentEvent[] =>
	Option.match(decodeItem(params), {
		onNone: () => [{ raw, type: "raw" }],
		onSome: ({ item }) => project(raw, item),
	});

// Codex item/completed carries transcript content; turn/completed does not.
// Codex exposes background terminals through explicit requests, not a push stream.
export const toAgentEvents = (notification: RpcNotification): AgentEvent[] => {
	const raw = rawOf(notification.method, notification.params);
	switch (notification.method) {
		case "item/started":
			return itemEvents(raw, notification.params, itemStarted);
		case "item/completed":
			return itemEvents(raw, notification.params, itemCompleted);
		case "turn/started":
			return turnStarted(raw, notification.params);
		case "turn/completed":
			return turnCompleted(raw, notification.params);
		case "thread/status/changed":
			return threadStateEvents(raw, notification.params);
		case "thread/tokenUsage/updated":
			return tokenUsage(raw, notification.params);
		case RATE_LIMITS_METHOD:
			return rateLimitEvents(raw, notification.params);
		default:
			return [{ raw, type: "raw" }];
	}
};
