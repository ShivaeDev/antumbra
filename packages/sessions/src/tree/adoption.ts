import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events";
import { Clock, Effect, Option, Ref } from "effect";
import { type SessionTree, spawnerOf, type TreeNode, withAdopted, withNode } from "#tree/attribution.ts";
import { adoptedLateGap, observed } from "#tree/gaps.ts";
import { makeSessionTreeReopen } from "#tree/reopen.ts";
import { makeSessionTreeRows } from "#tree/rows.ts";

type SubsessionOpened = Extract<AgentEvent, { type: "subsession.opened" }>;

const admittedOpening = (node: string, seen: AgentEvent): AgentEvent => ({
	nativeRef: node,
	raw: observed("session/admitted", { node, seen: seen.type }),
	type: "session.opened",
});

// Provider tree frames can arrive before the node's opening announcement.
export const makeSessionTreeAdoption = Effect.gen(function* () {
	const journal = yield* SessionEventJournal;
	const reopening = yield* makeSessionTreeReopen;
	const rows = yield* makeSessionTreeRows;
	return (rootSessionId: string, tree: Ref.Ref<SessionTree>) => {
		const reopen = reopening(rootSessionId, tree);
		const mint = (subsessionRef: string, origin: Origin, seen: AgentEvent) =>
			Effect.gen(function* () {
				const root = yield* rows.rootRow(rootSessionId);
				if (Option.isNone(root)) {
					return undefined;
				}
				const node: TreeNode = {
					announced: false,
					openedAt: yield* Clock.currentTimeMillis,
					sessionId: crypto.randomUUID(),
					spawnerSessionId: spawnerOf(yield* Ref.get(tree), { parentRef: origin.parentNode, spawnedBy: origin.spawnedBy }, rootSessionId),
					subsessionRef,
				};
				const recorded = yield* journal.recordTogether({
					appends: [
						{
							event: admittedOpening(subsessionRef, seen),
							sessionId: node.sessionId,
						},
					],
					rows: rows.openNode(root.value, {
						kind: null,
						label: null,
						sessionId: node.sessionId,
						spawnerSessionId: node.spawnerSessionId,
					}),
				});
				if (!recorded) {
					return undefined;
				}
				yield* Ref.update(tree, withNode(node, origin.spawnedBy));
				return node;
			});
		const admit = (origin: Origin, seen: AgentEvent) =>
			Effect.gen(function* () {
				const subsessionRef = origin.node;
				if (subsessionRef === undefined) {
					return undefined;
				}
				const durable = yield* reopen(subsessionRef, origin.spawnedBy, seen);
				return durable ?? (yield* mint(subsessionRef, origin, seen));
			});
		const adopt = (node: TreeNode, opened: SubsessionOpened) =>
			Effect.gen(function* () {
				const announcedAt = yield* Clock.currentTimeMillis;
				const spawnerSessionId = spawnerOf(yield* Ref.get(tree), opened, rootSessionId);
				const recorded = yield* journal.recordTogether({
					appends: [
						{ event: opened, sessionId: spawnerSessionId },
						{
							event: adoptedLateGap(node, announcedAt),
							sessionId: node.sessionId,
						},
					],
					rows: rows.adoptNode(node.sessionId, {
						kind: opened.kind,
						label: opened.label,
						parentSessionId: spawnerSessionId,
					}),
				});
				if (recorded) {
					yield* Ref.update(tree, withAdopted(node, opened.spawnedBy, spawnerSessionId));
				}
				return recorded;
			});
		return { admit, adopt, reopen };
	};
});
