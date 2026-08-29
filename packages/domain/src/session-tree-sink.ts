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
import { LiveDelegations } from "#session-tree-live.ts";
import { makeSessionTreeSweeps } from "#session-tree-sweeps.ts";
import { makeSessionTurnRests } from "#session-turn-rest.ts";

type SubsessionOpened = Extract<AgentEvent, { type: "subsession.opened" }>;
type RecordEvent = (event: AgentEvent) => Effect.Effect<boolean>;

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
	const live = yield* LiveDelegations;
	const turnRestFor = yield* makeSessionTurnRests;
	const sinkFor: SinkFor = (rootSessionId, audit) =>
		Effect.gen(function* () {
			const tree = yield* Ref.make(emptySessionTree);
			const nodes = lifecycle(rootSessionId, tree);
			// why: delegating tracks children that are working, never rows that are
			// open, so a census answers it directly. A child the provider says is not
			// running releases whatever delegation was held for it — otherwise a lane
			// that never announces a finish leaves a tree delegating for good. One it
			// says is running holds a delegation whether or not this life ever carried
			// its frames, which is what makes rest truthful after a restart: the
			// registry starts empty, and the census is then the only account of a
			// child that is genuinely still going.
			const censused = (nodeSessionId: string, working: boolean) =>
				working
					? live.began(rootSessionId, nodeSessionId)
					: live.ended(rootSessionId, nodeSessionId);
			const sweeps = yield* sweepsFor(audit, rootSessionId, censused);
			const turns = yield* turnRestFor(rootSessionId);
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
			// why: an announcement carried by the stream is a child starting work
			// now. The same announcement replayed out of a census is the record
			// catching up on one that already ran, so only the first says the tree
			// is delegating — otherwise every reconnect would report the children a
			// census found as though they had just begun.
			const opened = (event: SubsessionOpened, fromStream: boolean) =>
				Effect.gen(function* () {
					const recorded = yield* nodes.openNode(event);
					const node = (yield* Ref.get(tree)).nodes.get(event.subsessionRef);
					if (fromStream && node !== undefined) {
						yield* live.began(rootSessionId, node.sessionId);
					}
					return recorded;
				});
			// why: the close is the moment the record can ask whether what it holds
			// of this node is all there was, so the audit runs on the node the ending
			// named and the projection lands on whatever the audit found. A census
			// admits through this same path, which is why it is handed back in.
			const recording = (fromStream: boolean): RecordEvent => {
				const self: RecordEvent = (event) => {
					if (event.type === "subsession.opened") {
						return opened(event, fromStream);
					}
					if (event.type !== "subsession.ended") {
						return routed(event);
					}
					return Effect.gen(function* () {
						const node = (yield* Ref.get(tree)).nodes.get(event.subsessionRef);
						const recorded = yield* nodes.closeNode(event);
						if (node !== undefined) {
							yield* live.ended(rootSessionId, node.sessionId);
							yield* sweeps.closed(node.sessionId, recording(false));
						}
						return recorded;
					});
				};
				return self;
			};
			// why: only a frame arriving live says what the Session is doing now. A
			// census replays what it already did, and an ending replayed there would
			// rest a Session that has been given new work since.
			const streamed = recording(true);
			const record: RecordEvent = (event) =>
				streamed(event).pipe(Effect.tap(() => turns.observed(event)));
			// why: silence is not an ending. A node whose stream stopped mid-run
			// would otherwise stay open with nothing in its journal to say why, so
			// the loss is written on the node's own key before the pump is gone.
			const detached = Effect.gen(function* () {
				yield* live.released(rootSessionId);
				yield* turns.stranded;
				const unfinished = openNodes(yield* Ref.get(tree));
				if (unfinished.length === 0) {
					return;
				}
				const detachedAt = yield* Clock.currentTimeMillis;
				yield* Effect.forEach(
					unfinished,
					(node) =>
						journal.record(node.sessionId, streamDetachedGap(node, detachedAt)),
					{ concurrency: 1, discard: true },
				);
			});
			return {
				attached: sweeps.reconnected(recording(false)),
				detached,
				record,
			} satisfies EventSink;
		});
	return sinkFor;
});
