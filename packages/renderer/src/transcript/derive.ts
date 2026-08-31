import type { SessionEvent, SessionTreeNode } from "@antumbra/contract";
import { applyKnownEvent, type Derivation } from "#transcript/apply-event.ts";
import { nodesByRef } from "#transcript/delegation.ts";
import type { TranscriptItem } from "#transcript/model.ts";
import { openToolCalls } from "#transcript/tool-calls.ts";

const applyEvent = (state: Derivation, row: SessionEvent): void => {
	switch (row.event._tag) {
		case "Known":
			applyKnownEvent(state, row.event.event, row.seq);
			return;
		case "Unknown":
			state.items.push({
				kind: "raw",
				label: row.event.kind,
				payload: row.event.payload,
				seq: row.seq,
			});
			return;
	}
	row.event satisfies never;
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
