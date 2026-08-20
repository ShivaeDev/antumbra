import { Database } from "@antumbra/persistence";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Clock, Effect, Option, Ref } from "effect";
import {
	type SessionTree,
	type TreeNode,
	withNode,
} from "#session-tree-attribution.ts";
import { observed } from "#session-tree-gaps.ts";
import { makeSessionTreeJournaling } from "#session-tree-journaling.ts";
import { makeSessionTreeLedger } from "#session-tree-ledger.ts";

// why: the node is opening again, in the words the record uses for any Session
// opening — the same reference, the same key, a second time. A reader sees the
// node resume rather than a second node appearing beside it.
const reopening = (nativeRef: string, seen: AgentEvent): AgentEvent => ({
	nativeRef,
	raw: observed("session/reopened", { node: nativeRef, seen: seen.type }),
	type: "session.opened",
});

// why: a resumed Session starts with an empty tree while the durable one is
// already written, and a provider that re-drives its children across
// activations sends their frames again. Minting on those frames would give one
// thread two rows and split its transcript in half, so both seams that mint ask
// the record first: a reference this root already holds is reopened — recording
// again, whatever an earlier audit concluded — and the tree is hydrated from
// the row rather than from a memory the restart erased.
export const makeSessionTreeReopen = Effect.gen(function* () {
	const db = yield* Database;
	const journal = yield* SessionEventJournal;
	const journaling = yield* makeSessionTreeJournaling;
	const ledger = yield* makeSessionTreeLedger;
	const reopenRow = (sessionId: string) =>
		db.AgentSession.where({ id: sessionId })
			.update({ completeness: "recording", status: "open" })
			.pipe(Effect.asVoid);
	return (rootSessionId: string, tree: Ref.Ref<SessionTree>) =>
		(subsessionRef: string, spawnedBy: string, seen: AgentEvent) =>
			Effect.gen(function* () {
				const row = yield* ledger.nodeRow(rootSessionId, subsessionRef);
				if (Option.isNone(row)) {
					return undefined;
				}
				// why: everything earlier activations learned about this node is in
				// the row, so it counts as announced: a later announcement fills the
				// holes the row still has and never re-dates work already placed.
				const node: TreeNode = {
					announced: true,
					openedAt: yield* Clock.currentTimeMillis,
					sessionId: row.value.id,
					spawnerSessionId: row.value.parentSessionId ?? rootSessionId,
					subsessionRef,
				};
				const event = reopening(subsessionRef, seen);
				const recorded = yield* journal.recordTogether({
					appends: [{ event, sessionId: node.sessionId }],
					rows: reopenRow(node.sessionId),
				});
				yield* Ref.update(tree, withNode(node, spawnedBy));
				yield* journaling.settle(node, event, recorded);
				return node;
			});
});
