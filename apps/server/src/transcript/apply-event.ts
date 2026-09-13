import type { TranscriptItem, TranscriptMessage, TranscriptThinking } from "@antumbra/domain-sessions/rows/transcript.ts";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import type { RateLimitEvent } from "@antumbra/platform-vocabulary/session-events/rate-limit.ts";
import type { RawEvent } from "@antumbra/platform-vocabulary/session-events/raw.ts";
import { endedDelegation, type NodesByRef, openedDelegation } from "#transcript/delegation.ts";
import { gapNotice } from "#transcript/gaps.ts";
import { backgroundLabel, openedLabel, rawLabel, reroutedLabel, stateLabel, turnLabel } from "#transcript/labels.ts";
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

const subjectOf = (event: AgentEvent): string => {
	const origin = "origin" in event && event.origin !== undefined ? `${event.origin.spawnedBy} ${event.origin.node ?? ""}` : "";
	return `${event.type} ${origin}`;
};

const fresh = (state: Derivation, subject: string, content: string): boolean => {
	if (state.shown.get(subject) === content) {
		return false;
	}
	state.shown.set(subject, content);
	return true;
};

const pushTelemetry = (state: Derivation, label: string, seq: number): void => {
	state.items.push({ kind: "telemetry", label, seq });
};

const showReading = (state: Derivation, event: AgentEvent, label: string, seq: number): void => {
	if (fresh(state, subjectOf(event), label)) {
		pushTelemetry(state, label, seq);
	}
};

const showRateLimit = (state: Derivation, event: typeof RateLimitEvent.Type, seq: number): void => {
	if (event.status === "rejected") {
		state.shown.delete(subjectOf(event));
	}
	showReading(state, event, rateLimitLabel(event), seq);
};

const showRaw = (state: Derivation, event: typeof RawEvent.Type, seq: number): void => {
	if (fresh(state, subjectOf(event), `${event.raw.source} ${event.raw.kind} ${event.raw.payload}`)) {
		state.items.push({ kind: "raw", label: rawLabel(event.raw), payload: event.raw.payload, seq });
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
		case "model.rerouted":
			pushTelemetry(state, reroutedLabel(event), seq);
			return;
		case "rate.limit":
			showRateLimit(state, event, seq);
			return;
		case "session.opened":
			showReading(state, event, openedLabel(event), seq);
			return;
		case "session.state":
			showReading(state, event, stateLabel(event), seq);
			return;
		case "session.background":
			showReading(state, event, backgroundLabel(event), seq);
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
			showRaw(state, event, seq);
			return;
	}
	event satisfies never;
};
