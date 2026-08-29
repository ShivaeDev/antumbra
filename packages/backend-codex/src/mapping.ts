import type {
	AgentEvent,
	RawPayload,
} from "@antumbra/vocabulary/session-events";
import { Option, Schema } from "effect";
import type { RpcNotification } from "#adapters/rpc.ts";
import { itemCompleted, itemStarted } from "#items.ts";
import {
	ItemNotification,
	TokenUsageNotification,
	TurnNotification,
} from "#protocol.ts";
import { threadStateEvents } from "#thread-state.ts";

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

// why: the turn edges are codex's own busy bookends, and a turn ending is the
// session going idle. They stand beside `thread/status/changed` rather than
// instead of it: the level signal is the only one that carries the waiting
// flags, and the edges are the only ones tied to a turn id. Both are what
// codex said, and the last one to arrive is what the session is doing.
const turnStarted = (raw: RawPayload, params: unknown): AgentEvent[] =>
	Option.isNone(decodeTurn(params))
		? [{ raw, type: "raw" }]
		: [{ raw, state: "running", type: "session.state" }];

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
			{ raw, state: "idle", type: "session.state" },
		],
	});

const tokenUsage = (raw: RawPayload, params: unknown): AgentEvent[] =>
	Option.match(decodeUsage(params), {
		onNone: () => [{ raw, type: "raw" }],
		// why: `last` is the increment for one model round trip; summing the
		// usage events of a session reproduces `total`. codex reports no money
		// at all, so both cost fields stay absent rather than being guessed from
		// a price list this record does not hold.
		onSome: ({ tokenUsage }) => [
			{
				cacheReadTokens: tokenUsage.last.cachedInputTokens,
				...(tokenUsage.last.cacheWriteInputTokens === undefined
					? {}
					: { cacheWriteTokens: tokenUsage.last.cacheWriteInputTokens }),
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
//
// why: no background set for codex. Its background terminals are a request the
// client makes — list, terminate, clean — and the server pushes nothing when
// one starts or stops. Polling for them would put a made-up refresh rate in
// the record, so this backend reports no background work rather than a picture
// that is stale by design.
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
		default:
			return [{ raw, type: "raw" }];
	}
};
