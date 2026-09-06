import type { SessionAudit } from "@antumbra/plugin-api";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { EventSink } from "@antumbra/session-fabric";
import type { AgentEvent } from "@antumbra/vocabulary/session-events.ts";
import { Clock, Effect, Ref } from "effect";
import { emptySessionTree, nodeOf, openNodes, withCaller } from "#tree/attribution.ts";
import { streamDetachedGap } from "#tree/gaps.ts";
import { SessionTreeLifecycle } from "#tree/lifecycle/service.ts";
import { LiveDelegations } from "#tree/live.ts";
import { SessionTreeSweeps } from "#tree/sweeps/service.ts";
import { SessionTurnRests } from "#turn-rest/service.ts";

type SubsessionEnded = Extract<AgentEvent, { type: "subsession.ended" }>;
type SubsessionOpened = Extract<AgentEvent, { type: "subsession.opened" }>;
type RecordEvent = (event: AgentEvent) => Effect.Effect<boolean, unknown>;

export const create = Effect.fn("SessionTreeSinks.create")(function* (
	rootSessionId: string,
	audit: SessionAudit,
	afterRest: Effect.Effect<void, unknown>,
) {
	const journal = yield* SessionEventJournal;
	const nodes = yield* SessionTreeLifecycle;
	const treeSweeps = yield* SessionTreeSweeps;
	const live = yield* LiveDelegations;
	const turnRests = yield* SessionTurnRests;
	const report = (operation: string, cause: unknown) => Effect.logError("session tree persistence failed", { operation, rootSessionId }, cause);
	const tree = yield* Ref.make(emptySessionTree);
	const censused = (nodeSessionId: string, working: boolean) =>
		working ? live.began(rootSessionId, nodeSessionId) : live.ended(rootSessionId, nodeSessionId);
	const sweeps = yield* treeSweeps.create(audit, rootSessionId, censused);
	const turns = yield* turnRests.create(rootSessionId, afterRest);
	const routed = (event: AgentEvent) =>
		Effect.gen(function* () {
			const known = nodeOf(yield* Ref.get(tree), event);
			const node = known ?? (yield* nodes.admitNode(rootSessionId, tree, event));
			if (event.type === "tool.started") {
				yield* Ref.update(tree, withCaller(event.toolId, node?.sessionId ?? rootSessionId));
			}
			return node === undefined ? yield* journal.record(rootSessionId, event) : yield* nodes.recordOn(node, event);
		});
	const opened = (event: SubsessionOpened, fromStream: boolean) =>
		Effect.gen(function* () {
			const recorded = yield* nodes.openNode(rootSessionId, tree, event);
			const node = (yield* Ref.get(tree)).nodes.get(event.subsessionRef);
			if (fromStream && node !== undefined) {
				yield* live.began(rootSessionId, node.sessionId);
			}
			return recorded;
		});
	const closed = (event: SubsessionEnded, again: RecordEvent) =>
		Effect.gen(function* () {
			const node = (yield* Ref.get(tree)).nodes.get(event.subsessionRef);
			const recorded = yield* nodes.closeNode(rootSessionId, tree, event);
			if (node !== undefined) {
				yield* live.ended(rootSessionId, node.sessionId);
				yield* sweeps.closed(node.sessionId, again);
			}
			return recorded;
		});
	const recording =
		(fromStream: boolean): RecordEvent =>
		(event) => {
			if (event.type === "subsession.opened") {
				return opened(event, fromStream);
			}
			return event.type === "subsession.ended" ? closed(event, recording(false)) : routed(event);
		};
	const streamed = recording(true);
	const record = (event: AgentEvent) =>
		streamed(event).pipe(
			Effect.tap(() => turns.observed(event)),
			Effect.catchCause((cause) => report("record", cause).pipe(Effect.as(false))),
		);
	const detached = Effect.gen(function* () {
		yield* live.released(rootSessionId);
		yield* turns.stranded;
		const unfinished = openNodes(yield* Ref.get(tree));
		if (unfinished.length === 0) {
			return;
		}
		const detachedAt = yield* Clock.currentTimeMillis;
		yield* Effect.forEach(unfinished, (node) => journal.record(node.sessionId, streamDetachedGap(node, detachedAt)), {
			concurrency: 1,
			discard: true,
		});
	});
	return {
		attached: sweeps.reconnected(recording(false)).pipe(Effect.catchCause((cause) => report("attach", cause))),
		detached,
		record,
	} satisfies EventSink;
});
