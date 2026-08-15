import type { AgentEvent, RawPayload } from "@antumbra/session-events";
import { Option, Schema } from "effect";
import type { RpcNotification } from "#adapters/rpc.ts";
import { itemCompleted, itemStarted } from "#items.ts";
import {
	ItemNotification,
	TokenUsageNotification,
	TurnNotification,
} from "#protocol.ts";

const decodeTurn = Schema.decodeUnknownOption(TurnNotification);
const decodeUsage = Schema.decodeUnknownOption(TokenUsageNotification);
const decodeItem = Schema.decodeUnknownOption(ItemNotification);

export const rawOf = (kind: string, payload: unknown): RawPayload => ({
	kind,
	payload: JSON.stringify(payload),
	source: "codex",
});

const turnStatus = (
	status: typeof TurnNotification.Type.turn.status,
): "completed" | "failed" | "interrupted" =>
	status === "inProgress" ? "completed" : status;

const turnCompleted = (raw: RawPayload, params: unknown): AgentEvent[] =>
	Option.match(decodeTurn(params), {
		onNone: () => [{ raw, type: "raw" }],
		onSome: ({ turn }) => [
			{
				...(turn.durationMs === null || turn.durationMs === undefined
					? {}
					: { durationMs: turn.durationMs }),
				raw,
				status: turnStatus(turn.status),
				type: "turn.completed",
			},
		],
	});

const tokenUsage = (raw: RawPayload, params: unknown): AgentEvent[] =>
	Option.match(decodeUsage(params), {
		onNone: () => [{ raw, type: "raw" }],
		// why: `last` is the increment for one model round trip; summing the
		// usage events of a session reproduces `total`.
		onSome: ({ tokenUsage }) => [
			{
				inputTokens: tokenUsage.last.inputTokens,
				outputTokens: tokenUsage.last.outputTokens,
				raw,
				type: "usage",
			},
		],
	});

const itemEvents = (
	raw: RawPayload,
	params: unknown,
	project: typeof itemStarted,
): AgentEvent[] =>
	Option.match(decodeItem(params), {
		onNone: () => [{ raw, type: "raw" }],
		onSome: ({ item }) => project(raw, item),
	});

// why: item/completed carries the whole item and is authoritative; the
// terminal turn payload is not a transcript (interrupted turns replay
// nothing), so every event is derived from the item stream.
export const toAgentEvents = (notification: RpcNotification): AgentEvent[] => {
	const raw = rawOf(notification.method, notification.params);
	switch (notification.method) {
		case "item/started":
			return itemEvents(raw, notification.params, itemStarted);
		case "item/completed":
			return itemEvents(raw, notification.params, itemCompleted);
		case "turn/completed":
			return turnCompleted(raw, notification.params);
		case "thread/tokenUsage/updated":
			return tokenUsage(raw, notification.params);
		default:
			return [{ raw, type: "raw" }];
	}
};
