import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events.ts";
import { Effect, Ref } from "effect";
import { type SessionTree, withClosed } from "#tree/attribution.ts";
import { settle } from "#tree/lifecycle/settle.ts";
import { SessionTreeRows } from "#tree/rows/service.ts";

type SubsessionEnded = Extract<AgentEvent, { type: "subsession.ended" }>;

export const closeNode = Effect.fn("SessionTreeLifecycle.closeNode")(function* (
	rootSessionId: string,
	tree: Ref.Ref<SessionTree>,
	ended: SubsessionEnded,
) {
	const rows = yield* SessionTreeRows;
	const journal = yield* SessionEventJournal;
	const node = (yield* Ref.get(tree)).nodes.get(ended.subsessionRef);
	if (node === undefined) {
		return yield* journal.record(rootSessionId, ended);
	}
	const recorded = yield* journal.recordTogether({
		appends: [{ event: ended, sessionId: node.spawnerSessionId }],
		rows: rows.closeNode(node.sessionId, ended.outcome),
	});
	if (!recorded) {
		return yield* settle(node, ended, recorded);
	}
	yield* Ref.update(tree, withClosed(ended.subsessionRef));
	return true;
});
