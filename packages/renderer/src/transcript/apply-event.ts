import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { endedDelegation, type NodesByRef, openedDelegation } from "#transcript/delegation.ts";
import { gapNotice } from "#transcript/gaps.ts";
import { backgroundLabel, openedLabel, rawLabel, stateLabel, turnLabel } from "#transcript/labels.ts";
import { transcriptMessage } from "#transcript/message.ts";
import type { TranscriptItem, TranscriptMessage, TranscriptThinking } from "#transcript/model.ts";
import { rateLimitLabel } from "#transcript/rate-limit-label.ts";
import type { ToolCalls } from "#transcript/tool-calls.ts";
import { usageLabel } from "#transcript/usage-label.ts";

export interface Derivation {
	readonly items: TranscriptItem[];
	readonly nodes: NodesByRef;
	readonly tools: ToolCalls;
}

// why: a wordless thinking block is an event, not narration — providers emit
// them by the hundred. Kept, it renders as a blank block that still spends the
// transcript's spacing, opening a gap with nothing in it to explain the gap.
const pushNarration = (state: Derivation, item: TranscriptMessage | TranscriptThinking): void => {
	if (item.text !== "" || (item.kind === "message" && item.parts.some((part) => part.type === "image"))) {
		state.items.push(item);
	}
};

const pushTelemetry = (state: Derivation, label: string, seq: number): void => {
	state.items.push({ kind: "telemetry", label, seq });
};

// why: the transcript is a pure derivation of a Known neutral event. Provider
// RawEvent stays visually raw and every other variant is handled exhaustively.
export const applyKnownEvent = (state: Derivation, event: AgentEvent, seq: number): void => {
	switch (event.type) {
		case "message":
			pushNarration(state, transcriptMessage(event, seq));
			return;
		case "thinking":
			pushNarration(state, {
				kind: "thinking",
				seq,
				text: event.text.trim(),
			});
			return;
		case "tool.started":
			state.tools.start(event.toolId, {
				input: event.input,
				kind: "tool",
				name: event.name,
				ok: undefined,
				...(event.providerName === undefined ? {} : { providerName: event.providerName }),
				result: undefined,
				seq,
				...(event.servedBy === undefined ? {} : { servedBy: event.servedBy }),
			});
			return;
		case "tool.completed":
			state.tools.complete(event.toolId, event.ok, event.output);
			return;
		case "usage":
			pushTelemetry(state, usageLabel(event), seq);
			return;
		case "turn.completed":
			pushTelemetry(state, turnLabel(event), seq);
			return;
		case "rate.limit":
			pushTelemetry(state, rateLimitLabel(event), seq);
			return;
		case "session.opened":
			pushTelemetry(state, openedLabel(event), seq);
			return;
		case "session.state":
			pushTelemetry(state, stateLabel(event), seq);
			return;
		case "session.background":
			pushTelemetry(state, backgroundLabel(event), seq);
			return;
		case "subsession.opened":
			state.items.push(openedDelegation(state.nodes, event, seq));
			return;
		case "subsession.ended":
			state.items.push(endedDelegation(state.nodes, event, seq));
			return;
		case "subsession.gap":
			state.items.push(gapNotice(event, seq));
			return;
		case "raw":
			state.items.push({
				kind: "raw",
				label: rawLabel(event.raw),
				payload: event.raw.payload,
				seq,
			});
			return;
	}
	event satisfies never;
};
