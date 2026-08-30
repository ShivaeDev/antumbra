import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect } from "effect";
import type { TreeNode } from "#tree/attribution.ts";
import { appendFailedGap } from "#tree/gaps.ts";
import { makeSessionTreeRows } from "#tree/rows.ts";

// why: what a node's journal owes the record when a write to it fails. A
// swallowed append is exactly the silence this record cannot afford — a lost
// ending would leave a node open forever with nothing saying why.
export const makeSessionTreeJournaling = Effect.gen(function* () {
	const journal = yield* SessionEventJournal;
	const rows = yield* makeSessionTreeRows;
	// why: the row is marked outside the journal, then the loss is journaled too
	// when a further append can still land.
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
