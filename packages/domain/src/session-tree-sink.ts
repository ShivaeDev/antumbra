import type { SessionAudit } from "@antumbra/plugin-api";
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
import { makeSessionTreeSweeps } from "#session-tree-sweeps.ts";

// why: every frame the provider attributes to a node is journaled under that
// node's own Session id, so a delegated conversation reads as its own
// transcript instead of as words its parent never said. The tree that makes
// the routing possible is rebuilt from the stream each time one is attached.
// why: how the rest of the domain names the maker — a Session id and the
// backend's own auditor. Which storage an audit may read is a property of the
// lane the frames came from, so it travels with the sink rather than being
// discovered somewhere downstream.
export type SinkFor = (
	rootSessionId: string,
	audit: SessionAudit,
) => Effect.Effect<EventSink>;

export const makeSessionTreeSinks = Effect.gen(function* () {
	const journal = yield* SessionEventJournal;
	const lifecycle = yield* makeSessionTreeLifecycle;
	const sweepsFor = yield* makeSessionTreeSweeps;
	const sinkFor: SinkFor = (rootSessionId, audit) =>
		Effect.gen(function* () {
			const tree = yield* Ref.make(emptySessionTree);
			const nodes = lifecycle(rootSessionId, tree);
			const sweeps = yield* sweepsFor(audit, rootSessionId);
			// why: a tool call is remembered against the journal it was written to,
			// because that is the only place the spawner of the node it starts is
			// recorded — at depth two the caller is a node, not the root.
			const routed = (event: AgentEvent) =>
				Effect.gen(function* () {
					const known = nodeOf(yield* Ref.get(tree), event);
					// why: a node the record has never been told about is admitted on the
					// first frame that names it, so what it said lands in its own journal
					// rather than in the root's or nowhere at all.
					const node = known ?? (yield* nodes.admitNode(event));
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
			// why: the close is the moment the record can ask whether what it holds
			// of this node is all there was, so the audit runs on the node the ending
			// named and the projection lands on whatever the audit found. A census
			// admits through this same path, which is why it is handed back in.
			const record = (event: AgentEvent): Effect.Effect<boolean> => {
				if (event.type === "subsession.opened") {
					return nodes.openNode(event);
				}
				if (event.type !== "subsession.ended") {
					return routed(event);
				}
				return Effect.gen(function* () {
					const node = (yield* Ref.get(tree)).nodes.get(event.subsessionRef);
					const recorded = yield* nodes.closeNode(event);
					if (node !== undefined) {
						yield* sweeps.closed(node.sessionId, record);
					}
					return recorded;
				});
			};
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
				attached: sweeps.reconnected(record),
				detached,
				record,
			} satisfies EventSink;
		});
	return sinkFor;
});
