import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events.ts";
import { Effect } from "effect";
import type { TreeNode } from "#tree/attribution.ts";
import { settle } from "#tree/lifecycle/settle.ts";

export const recordOn = Effect.fn("SessionTreeLifecycle.recordOn")(function* (node: TreeNode, event: AgentEvent) {
	const journal = yield* SessionEventJournal;
	return yield* settle(node, event, yield* journal.record(node.sessionId, event));
});
