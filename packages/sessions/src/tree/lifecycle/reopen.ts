import { Database } from "@antumbra/persistence";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Clock, Effect, Option, Ref } from "effect";
import { type SessionTree, type TreeNode, withNode } from "#tree/attribution.ts";
import { observed } from "#tree/gaps.ts";
import { SessionTreeLedger } from "#tree/ledger/service.ts";
import { settle } from "#tree/lifecycle/settle.ts";

const reopening = (nativeRef: string, seen: AgentEvent): AgentEvent => ({
	nativeRef,
	raw: observed("session/reopened", { node: nativeRef, seen: seen.type }),
	type: "session.opened",
});

export const reopen = Effect.fn("SessionTreeLifecycle.reopen")(function* (
	rootSessionId: string,
	tree: Ref.Ref<SessionTree>,
	subsessionRef: string,
	spawnedBy: string,
	seen: AgentEvent,
) {
	const db = yield* Database;
	const journal = yield* SessionEventJournal;
	const ledger = yield* SessionTreeLedger;

	const row = yield* ledger.nodeRow(rootSessionId, subsessionRef);
	if (Option.isNone(row)) {
		return undefined;
	}
	const node: TreeNode = {
		announced: true,
		openedAt: yield* Clock.currentTimeMillis,
		sessionId: row.value.id,
		spawnerSessionId: row.value.parentSessionId ?? rootSessionId,
		subsessionRef,
	};
	const event = reopening(subsessionRef, seen);
	const recorded = yield* journal.recordTogether({
		appends: [{ event, sessionId: node.sessionId }],
		rows: db.AgentSession.where({ id: node.sessionId }).update({ completeness: "recording", status: "open" }).pipe(Effect.asVoid),
	});
	yield* Ref.update(tree, withNode(node, spawnedBy));
	yield* settle(node, event, recorded);
	return node;
});
