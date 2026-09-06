import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events.ts";
import { Clock, Effect, Option, Ref } from "effect";
import { type SessionTree, spawnerOf, type TreeNode, withNode } from "#tree/attribution.ts";
import { observed } from "#tree/gaps.ts";
import { SessionTreeRows } from "#tree/rows/service.ts";

const admittedOpening = (node: string, seen: AgentEvent): AgentEvent => ({
	nativeRef: node,
	raw: observed("session/admitted", { node, seen: seen.type }),
	type: "session.opened",
});

export const mintAdmitted = Effect.fn("SessionTreeLifecycle.mintAdmitted")(function* (
	rootSessionId: string,
	tree: Ref.Ref<SessionTree>,
	subsessionRef: string,
	origin: Origin,
	seen: AgentEvent,
) {
	const rows = yield* SessionTreeRows;
	const journal = yield* SessionEventJournal;
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
