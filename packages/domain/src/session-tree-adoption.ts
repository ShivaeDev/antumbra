import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events";
import { Clock, Effect, Option, Ref } from "effect";
import {
	type SessionTree,
	spawnerOf,
	type TreeNode,
	withAdopted,
	withNode,
} from "#session-tree-attribution.ts";
import { adoptedLateGap, observed } from "#session-tree-gaps.ts";
import { makeSessionTreeRows } from "#session-tree-rows.ts";

type SubsessionOpened = Extract<AgentEvent, { type: "subsession.opened" }>;

// why: a node admitted from its own words opens the way any Session does,
// naming the provider reference the frame was stamped with — the same field
// the opening path mirrors onto the row, so the node is addressable by the
// provider's name for it from its first line onward.
const admittedOpening = (node: string, seen: AgentEvent): AgentEvent => ({
	nativeRef: node,
	raw: observed("session/admitted", { node, seen: seen.type }),
	type: "session.opened",
});

// why: a provider whose tree broadcasts says what a node did before it says
// the node exists. Holding those words until an announcement arrives would
// risk losing them, and writing them to the root would put one Session's work
// in another's mouth — so the record admits the node on first hearing and
// waits to be told where it belongs.
export const makeSessionTreeAdoption = Effect.gen(function* () {
	const journal = yield* SessionEventJournal;
	const rows = yield* makeSessionTreeRows;
	return (rootSessionId: string, tree: Ref.Ref<SessionTree>) => {
		const admit = (origin: Origin, seen: AgentEvent) =>
			Effect.gen(function* () {
				const subsessionRef = origin.node;
				if (subsessionRef === undefined) {
					return undefined;
				}
				const root = yield* rows.rootRow(rootSessionId);
				if (Option.isNone(root)) {
					return undefined;
				}
				const node: TreeNode = {
					announced: false,
					openedAt: yield* Clock.currentTimeMillis,
					sessionId: crypto.randomUUID(),
					spawnerSessionId: spawnerOf(
						yield* Ref.get(tree),
						{ parentRef: origin.parentNode, spawnedBy: origin.spawnedBy },
						rootSessionId,
					),
					subsessionRef,
				};
				// why: the row and the opening are one fact — the event's foreign key
				// refuses a Session with no row — and nothing is journaled in the
				// spawner yet, because which Session spawned this node is exactly what
				// the record does not know until the announcement lands.
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
		// why: the announcement is where the node's opening belongs — in the
		// journal of the turn that made the call — so it is written there now
		// rather than on the root the admission had to guess at. The gap on the
		// node's own key is what keeps the dates honest afterwards.
		const adopt = (node: TreeNode, opened: SubsessionOpened) =>
			Effect.gen(function* () {
				const announcedAt = yield* Clock.currentTimeMillis;
				const spawnerSessionId = spawnerOf(
					yield* Ref.get(tree),
					opened,
					rootSessionId,
				);
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
					yield* Ref.update(
						tree,
						withAdopted(node, opened.spawnedBy, spawnerSessionId),
					);
				}
				return recorded;
			});
		return { admit, adopt };
	};
});
