import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events.ts";
import { Effect } from "effect";
import type { TreeNode } from "#tree/attribution.ts";
import { appendFailedGap } from "#tree/gaps.ts";
import { SessionTreeRows } from "#tree/rows/service.ts";

export const settle = Effect.fn("SessionTreeLifecycle.settle")(function* (node: TreeNode, lost: AgentEvent, recorded: boolean) {
	if (recorded) return true;
	const journal = yield* SessionEventJournal;
	const rows = yield* SessionTreeRows;
	yield* Effect.logWarning("subsession event append failed", { lostType: lost.type, sessionId: node.sessionId });
	yield* rows.markIncomplete(node.sessionId);
	yield* journal.record(node.sessionId, appendFailedGap(node.sessionId, lost));
	return false;
});
