import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Clock, Effect, Option, Ref } from "effect";
import { type SessionTree, spawnerOf, type TreeNode, withNode } from "#tree/attribution.ts";
import { SessionTreeRows } from "#tree/rows/service.ts";

const nodeOpening = (opened: SubsessionOpened): AgentEvent => ({
	nativeRef: opened.subsessionRef,
	raw: opened.raw,
	type: "session.opened",
});

type SubsessionOpened = Extract<AgentEvent, { type: "subsession.opened" }>;

export const mintOpened = Effect.fn("SessionTreeLifecycle.mintOpened")(function* (
	rootSessionId: string,
	tree: Ref.Ref<SessionTree>,
	opened: SubsessionOpened,
) {
	const rows = yield* SessionTreeRows;
	const journal = yield* SessionEventJournal;
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
