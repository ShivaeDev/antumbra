import type { TranscriptItem } from "@antumbra/domain-sessions/rows/transcript.ts";
import { applyKnownEvent, type Derivation } from "#transcript/apply-event.ts";
import { nodesByRef } from "#transcript/delegation.ts";
import { openToolCalls } from "#transcript/tool-calls.ts";
import type { SessionEvent, SessionTreeNode } from "#transcript/types.ts";

const applyEvent = (state: Derivation, row: SessionEvent): void => {
	switch (row.event._tag) {
		case "Known":
			applyKnownEvent(state, row.event.event, row.seq);
			return;
	}
};

export const deriveTranscript = (events: ReadonlyArray<SessionEvent>, nodes: ReadonlyArray<SessionTreeNode> = []): ReadonlyArray<TranscriptItem> => {
	const items: TranscriptItem[] = [];
	const state: Derivation = {
		items,
		nodes: nodesByRef(nodes),
		tools: openToolCalls(items),
	};
	for (const event of events) {
		applyEvent(state, event);
	}
	return state.items;
};
