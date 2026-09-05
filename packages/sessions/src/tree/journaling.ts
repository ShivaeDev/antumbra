import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect } from "effect";
import type { TreeNode } from "#tree/attribution.ts";
import { appendFailedGap } from "#tree/gaps.ts";
import { SessionTreeRows } from "#tree/rows/service.ts";

export const makeSessionTreeJournaling = Effect.gen(function* () {
	const journal = yield* SessionEventJournal;
	const rows = yield* SessionTreeRows;
	// Completeness is marked outside the failed journal append before recording the lost event.
	const appendFailed = (node: TreeNode, lost: AgentEvent) =>
		Effect.gen(function* () {
			yield* Effect.logWarning("subsession event append failed", {
				lostType: lost.type,
				sessionId: node.sessionId,
			});
			yield* rows.markIncomplete(node.sessionId);
			yield* journal.record(node.sessionId, appendFailedGap(node.sessionId, lost));
		});
	const settle = (node: TreeNode, lost: AgentEvent, recorded: boolean) =>
		recorded ? Effect.succeed(true) : appendFailed(node, lost).pipe(Effect.as(false));
	const recordOn = (node: TreeNode, event: AgentEvent) =>
		journal.record(node.sessionId, event).pipe(Effect.flatMap((recorded) => settle(node, event, recorded)));
	return { recordOn, settle };
});
