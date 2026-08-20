import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Clock, Effect, Option, Ref } from "effect";
import {
	callerOf,
	type SessionTree,
	type TreeNode,
	withClosed,
	withNode,
} from "#session-tree-attribution.ts";
import { appendFailedGap } from "#session-tree-gaps.ts";
import { makeSessionTreeRows } from "#session-tree-rows.ts";

type SubsessionOpened = Extract<AgentEvent, { type: "subsession.opened" }>;
type SubsessionEnded = Extract<AgentEvent, { type: "subsession.ended" }>;

// why: a node's own journal opens the way any Session's does, carrying the
// provider reference the frame named. The existing opening path mirrors that
// reference onto the row, so nativeRef has one writer for roots and nodes both.
const nodeOpening = (opened: SubsessionOpened): AgentEvent => ({
	nativeRef: opened.subsessionRef,
	raw: opened.raw,
	type: "session.opened",
});

// why: what a node's life does to the record. Opening and ending are facts
// about the turn that spawned it, so they are journaled in the spawner's
// journal; the node's own journal holds what the node itself did.
export const makeSessionTreeLifecycle = Effect.gen(function* () {
	const journal = yield* SessionEventJournal;
	const rows = yield* makeSessionTreeRows;
	return (rootSessionId: string, tree: Ref.Ref<SessionTree>) => {
		// why: a swallowed append is exactly the silence this record cannot
		// afford — a lost ending would leave a node open forever with nothing
		// saying why. The row is marked outside the journal, then the loss is
		// journaled too when a further append can still land.
		const appendFailed = (node: TreeNode, lost: AgentEvent) =>
			Effect.gen(function* () {
				yield* Effect.logWarning("subsession event append failed", {
					lostType: lost.type,
					sessionId: node.sessionId,
				});
				yield* rows.markIncomplete(node.sessionId);
				yield* journal.record(
					node.sessionId,
					appendFailedGap(node.sessionId, lost),
				);
			});
		const recordOn = (node: TreeNode, event: AgentEvent) =>
			journal
				.record(node.sessionId, event)
				.pipe(
					Effect.tap((recorded) =>
						recorded ? Effect.void : appendFailed(node, event),
					),
				);
		const openNode = (opened: SubsessionOpened) =>
			Effect.gen(function* () {
				const root = yield* rows.rootRow(rootSessionId);
				if (Option.isNone(root)) {
					return false;
				}
				const spawnerSessionId = callerOf(
					yield* Ref.get(tree),
					opened.spawnedBy,
					rootSessionId,
				);
				const node: TreeNode = {
					openedAt: yield* Clock.currentTimeMillis,
					sessionId: crypto.randomUUID(),
					spawnerSessionId,
					subsessionRef: opened.subsessionRef,
				};
				const recorded = yield* journal.recordTogether({
					appends: [
						{ event: opened, sessionId: spawnerSessionId },
						{ event: nodeOpening(opened), sessionId: node.sessionId },
					],
					rows: rows.openNode(root.value, {
						opened,
						sessionId: node.sessionId,
						spawnerSessionId,
					}),
				});
				if (recorded) {
					yield* Ref.update(tree, withNode(node, opened.spawnedBy));
				}
				return recorded;
			});
		const closeNode = (ended: SubsessionEnded) =>
			Effect.gen(function* () {
				const node = (yield* Ref.get(tree)).nodes.get(ended.subsessionRef);
				if (node === undefined) {
					return yield* journal.record(rootSessionId, ended);
				}
				const recorded = yield* journal.recordTogether({
					appends: [{ event: ended, sessionId: node.spawnerSessionId }],
					rows: rows.closeNode(node.sessionId, ended.outcome),
				});
				if (!recorded) {
					yield* appendFailed(node, ended);
					return false;
				}
				yield* Ref.update(tree, withClosed(ended.subsessionRef));
				return true;
			});
		return { closeNode, openNode, recordOn };
	};
});
