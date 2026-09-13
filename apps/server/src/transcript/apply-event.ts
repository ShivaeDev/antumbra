import type { TranscriptItem, TranscriptMessage, TranscriptThinking } from "@antumbra/domain-sessions/rows/transcript.ts";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import { endedDelegation, type NodesByRef, openedDelegation } from "#transcript/delegation.ts";
import { gapNotice } from "#transcript/gaps.ts";
import { backgroundLabel, openedLabel, rawLabel, stateLabel, turnLabel } from "#transcript/labels.ts";
import { transcriptMessage } from "#transcript/message.ts";
import { rateLimitLabel } from "#transcript/rate-limit-label.ts";
import type { ToolCalls } from "#transcript/tool-calls.ts";
import { usageLabel } from "#transcript/usage-label.ts";

export interface Derivation {
	readonly items: TranscriptItem[];
	readonly nodes: NodesByRef;
	readonly shown: Map<string, string>;
	readonly tools: ToolCalls;
}

const pushNarration = (state: Derivation, item: TranscriptMessage | TranscriptThinking): void => {
	if (item.text !== "" || (item.kind === "message" && item.parts.some((part) => part.type === "image"))) {
		state.items.push(item);
	}
};

const repeated = (state: Derivation, subject: string, content: string): boolean => {
	if (state.shown.get(subject) === content) {
		return true;
	}
	state.shown.set(subject, content);
	return false;
};

const pushTelemetry = (state: Derivation, label: string, seq: number): void => {
	state.items.push({ kind: "telemetry", label, seq });
};

const pushReading = (state: Derivation, subject: string, label: string, seq: number): void => {
	if (!repeated(state, subject, label)) {
		pushTelemetry(state, label, seq);
	}
};

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
			pushReading(state, event.type, rateLimitLabel(event), seq);
			return;
		case "session.opened":
			pushReading(state, event.type, openedLabel(event), seq);
			return;
		case "session.state":
			pushReading(state, event.type, stateLabel(event), seq);
			return;
		case "session.background":
			pushReading(state, event.type, backgroundLabel(event), seq);
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
			if (!repeated(state, `${event.type} ${event.raw.source} ${event.raw.kind} ${event.raw.payload}`, event.raw.payload)) {
				state.items.push({
					kind: "raw",
					label: rawLabel(event.raw),
					payload: event.raw.payload,
					seq,
				});
			}
			return;
	}
	event satisfies never;
};
