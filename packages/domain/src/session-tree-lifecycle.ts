import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Clock, Effect, Option, Ref } from "effect";
import { makeSessionTreeAdoption } from "#session-tree-adoption.ts";
import {
	originOf,
	type SessionTree,
	spawnerOf,
	type TreeNode,
	withClosed,
	withNode,
} from "#session-tree-attribution.ts";
import { makeSessionTreeJournaling } from "#session-tree-journaling.ts";
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
	const adoption = yield* makeSessionTreeAdoption;
	const journaling = yield* makeSessionTreeJournaling;
	return (rootSessionId: string, tree: Ref.Ref<SessionTree>) => {
		const adopting = adoption(rootSessionId, tree);
		// why: a node this tree already holds has already been announced, so a
		// second opening for the same reference is the provider saying more about
		// one node rather than a second one. Nothing is journaled twice; only a
		// name the row is still missing is taken from it.
		const nameNode = (node: TreeNode, opened: SubsessionOpened) =>
			opened.label === undefined
				? Effect.succeed(true)
				: rows.nameNode(node.sessionId, opened.label).pipe(Effect.as(true));
		// why: a node this tree admitted for itself is being announced for the
		// first time, which says both where it belongs and what it is — the two
		// facts the admission had to do without.
		const announce = (known: TreeNode, opened: SubsessionOpened) =>
			Effect.gen(function* () {
				if (known.announced) {
					return yield* nameNode(known, opened);
				}
				const adopted = yield* adopting.adopt(known, opened);
				return yield* journaling.settle(known, opened, adopted);
			});
		const openNode = (opened: SubsessionOpened) =>
			Effect.gen(function* () {
				const known = (yield* Ref.get(tree)).nodes.get(opened.subsessionRef);
				if (known !== undefined) {
					return yield* announce(known, opened);
				}
				const root = yield* rows.rootRow(rootSessionId);
				if (Option.isNone(root)) {
					return false;
				}
				const spawnerSessionId = spawnerOf(
					yield* Ref.get(tree),
					opened,
					rootSessionId,
				);
				const node: TreeNode = {
					announced: true,
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
						kind: opened.kind ?? null,
						label: opened.label ?? null,
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
					return yield* journaling.settle(node, ended, recorded);
				}
				yield* Ref.update(tree, withClosed(ended.subsessionRef));
				return true;
			});
		// why: a frame stamped with a node this tree has never been told about is
		// still that node's word, so the node is minted rather than the frame
		// misfiled. A frame that names no node at all is the root's own.
		const admitNode = (event: AgentEvent) => {
			const origin = originOf(event);
			return origin === undefined || origin.node === undefined
				? Effect.succeed(undefined)
				: adopting.admit(origin, event);
		};
		return { admitNode, closeNode, openNode, recordOn: journaling.recordOn };
	};
});
