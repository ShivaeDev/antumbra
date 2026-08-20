import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { EventSink } from "@antumbra/session-fabric";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Clock, Effect, Ref } from "effect";
import {
	emptySessionTree,
	nodeOf,
	openNodes,
	withCaller,
} from "#session-tree-attribution.ts";
import { streamDetachedGap } from "#session-tree-gaps.ts";
import { makeSessionTreeLifecycle } from "#session-tree-lifecycle.ts";

// why: every frame the provider attributes to a node is journaled under that
// node's own Session id, so a delegated conversation reads as its own
// transcript instead of as words its parent never said. The tree that makes
// the routing possible is rebuilt from the stream each time one is attached.
export const makeSessionTreeSinks = Effect.gen(function* () {
	const journal = yield* SessionEventJournal;
	const lifecycle = yield* makeSessionTreeLifecycle;
	return (rootSessionId: string): Effect.Effect<EventSink> =>
		Effect.gen(function* () {
			const tree = yield* Ref.make(emptySessionTree);
			const nodes = lifecycle(rootSessionId, tree);
			// why: a tool call is remembered against the journal it was written to,
			// because that is the only place the spawner of the node it starts is
			// recorded — at depth two the caller is a node, not the root.
			const routed = (event: AgentEvent) =>
				Effect.gen(function* () {
					const node = nodeOf(yield* Ref.get(tree), event);
					if (event.type === "tool.started") {
						yield* Ref.update(
							tree,
							withCaller(event.toolId, node?.sessionId ?? rootSessionId),
						);
					}
					return node === undefined
						? yield* journal.record(rootSessionId, event)
						: yield* nodes.recordOn(node, event);
				});
			// why: silence is not an ending. A node whose stream stopped mid-run
			// would otherwise stay open with nothing in its journal to say why, so
			// the loss is written on the node's own key before the pump is gone.
			const detached = Effect.gen(function* () {
				const stranded = openNodes(yield* Ref.get(tree));
				if (stranded.length === 0) {
					return;
				}
				const detachedAt = yield* Clock.currentTimeMillis;
				yield* Effect.forEach(
					stranded,
					(node) =>
						journal.record(node.sessionId, streamDetachedGap(node, detachedAt)),
					{ concurrency: 1, discard: true },
				);
			});
			return {
				detached,
				record: (event) => {
					if (event.type === "subsession.opened") {
						return nodes.openNode(event);
					}
					return event.type === "subsession.ended"
						? nodes.closeNode(event)
						: routed(event);
				},
			} satisfies EventSink;
		});
});
