import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events.ts";
import { Clock, Effect, Ref } from "effect";
import { type SessionTree, spawnerOf, type TreeNode, withAdopted } from "#tree/attribution.ts";
import { adoptedLateGap } from "#tree/gaps.ts";
import { SessionTreeRows } from "#tree/rows/service.ts";

type SubsessionOpened = Extract<AgentEvent, { type: "subsession.opened" }>;

export const adopt = Effect.fn("SessionTreeLifecycle.adopt")(function* (
	rootSessionId: string,
	tree: Ref.Ref<SessionTree>,
	node: TreeNode,
	opened: SubsessionOpened,
) {
	const rows = yield* SessionTreeRows;
	const journal = yield* SessionEventJournal;
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
