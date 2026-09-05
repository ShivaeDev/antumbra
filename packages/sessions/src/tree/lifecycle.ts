import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Clock, Effect, Option, Ref } from "effect";
import { makeSessionTreeAdoption } from "#tree/adoption.ts";
import { originOf, type SessionTree, spawnerOf, type TreeNode, withClosed, withNode } from "#tree/attribution.ts";
import { makeSessionTreeJournaling } from "#tree/journaling.ts";
import { SessionTreeRows } from "#tree/rows/service.ts";

type SubsessionOpened = Extract<AgentEvent, { type: "subsession.opened" }>;
type SubsessionEnded = Extract<AgentEvent, { type: "subsession.ended" }>;

const nodeOpening = (opened: SubsessionOpened): AgentEvent => ({
	nativeRef: opened.subsessionRef,
	raw: opened.raw,
	type: "session.opened",
});

export const makeSessionTreeLifecycle = Effect.gen(function* () {
	const journal = yield* SessionEventJournal;
	const rows = yield* SessionTreeRows;
	const adoption = yield* makeSessionTreeAdoption;
	const journaling = yield* makeSessionTreeJournaling;
	return (rootSessionId: string, tree: Ref.Ref<SessionTree>) => {
		const adopting = adoption(rootSessionId, tree);
		const nameNode = (node: TreeNode, opened: SubsessionOpened) =>
			opened.label === undefined ? Effect.succeed(true) : rows.nameNode(node.sessionId, opened.label).pipe(Effect.as(true));
		const announce = (known: TreeNode, opened: SubsessionOpened) =>
			Effect.gen(function* () {
				if (known.announced) {
					return yield* nameNode(known, opened);
				}
				const adopted = yield* adopting.adopt(known, opened);
				return yield* journaling.settle(known, opened, adopted);
			});
		const mint = (opened: SubsessionOpened) =>
			Effect.gen(function* () {
				const root = yield* rows.rootRow(rootSessionId);
				if (Option.isNone(root)) {
					return false;
				}
				const spawnerSessionId = spawnerOf(yield* Ref.get(tree), opened, rootSessionId);
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
		const openNode = (opened: SubsessionOpened) =>
			Effect.gen(function* () {
				const known = (yield* Ref.get(tree)).nodes.get(opened.subsessionRef);
				if (known !== undefined) {
					return yield* announce(known, opened);
				}
				const durable = yield* adopting.reopen(opened.subsessionRef, opened.spawnedBy, opened);
				return durable === undefined ? yield* mint(opened) : yield* announce(durable, opened);
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
		const admitNode = (event: AgentEvent) => {
			const origin = originOf(event);
			return origin === undefined || origin.node === undefined ? Effect.succeed(undefined) : adopting.admit(origin, event);
		};
		return { admitNode, closeNode, openNode, recordOn: journaling.recordOn };
	};
});
