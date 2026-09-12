import type { TranscriptItem } from "@antumbra/domain-sessions/rows/transcript.ts";
import { applyKnownEvent, type Derivation } from "#transcript/apply-event.ts";
import { nodesByRef } from "#transcript/delegation.ts";
import { openToolCalls } from "#transcript/tool-calls.ts";
import type { SessionEvent, SessionTreeNode } from "#transcript/types.ts";

export const deriveTranscript = (events: ReadonlyArray<SessionEvent>, nodes: ReadonlyArray<SessionTreeNode> = []): ReadonlyArray<TranscriptItem> => {
	const items: TranscriptItem[] = [];
	const state: Derivation = {
		items,
		nodes: nodesByRef(nodes),
		tools: openToolCalls(items),
	};
	for (const event of events) {
		applyKnownEvent(state, event.event, event.seq);
	}
	return state.items;
};
