import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import type { RawPayload } from "@antumbra/platform-vocabulary/session-events/raw.ts";
import { Option, Schema } from "effect";
import { itemCompleted, itemStarted } from "#items.ts";
import { ItemNotification, ModelReroutedNotification, TokenUsageNotification, TurnNotification } from "#protocol.ts";
import { RATE_LIMITS_METHOD, rateLimitEvents } from "#rate-limits.ts";
import type { RpcNotification } from "#rpc.ts";
import { threadStateEvents } from "#thread-state.ts";

const decodeTurn = Schema.decodeUnknownOption(TurnNotification);
const decodeUsage = Schema.decodeUnknownOption(TokenUsageNotification);
const decodeItem = Schema.decodeUnknownOption(ItemNotification);
const decodeRerouted = Schema.decodeUnknownOption(ModelReroutedNotification);

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

const tokenUsage = (raw: RawPayload, params: unknown, threadModel: string): AgentEvent[] =>
	Option.match(decodeUsage(params), {
		onNone: () => [{ raw, type: "raw" }],
		// Codex reports per-round usage in `last`; no cost fields are present and no notification names the model a round ran on.
		onSome: ({ tokenUsage }) => {
			const spent = {
				cacheReadTokens: tokenUsage.last.cachedInputTokens,
				...(tokenUsage.last.cacheWriteInputTokens === undefined ? {} : { cacheWriteTokens: tokenUsage.last.cacheWriteInputTokens }),
				inputTokens: tokenUsage.last.inputTokens,
				outputTokens: tokenUsage.last.outputTokens,
			};
			return [{ ...spent, byModel: [{ ...spent, model: threadModel }], raw, type: "usage" }];
		},
	});

const modelRerouted = (raw: RawPayload, params: unknown): AgentEvent[] =>
	Option.match(decodeRerouted(params), {
		onNone: () => [{ raw, type: "raw" }],
		onSome: ({ reason, toModel }) => [{ model: toModel, raw, reason, type: "model.rerouted" }],
	});

const itemEvents = (raw: RawPayload, params: unknown, project: typeof itemStarted): AgentEvent[] =>
	Option.match(decodeItem(params), {
		onNone: () => [{ raw, type: "raw" }],
		onSome: ({ item }) => project(raw, item),
	});

// Codex item/completed carries transcript content; turn/completed does not.
// Codex exposes background terminals through explicit requests, not a push stream.
export const toAgentEvents = (notification: RpcNotification, threadModel: string): AgentEvent[] => {
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
			return tokenUsage(raw, notification.params, threadModel);
		case "model/rerouted":
			return modelRerouted(raw, notification.params);
		case RATE_LIMITS_METHOD:
			return rateLimitEvents(raw, notification.params);
		default:
			return [{ raw, type: "raw" }];
	}
};
