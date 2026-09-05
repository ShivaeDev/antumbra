import { Database } from "@antumbra/persistence";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Clock, Effect, Option, Ref } from "effect";
import { type SessionTree, type TreeNode, withNode } from "#tree/attribution.ts";
import { observed } from "#tree/gaps.ts";
import { makeSessionTreeJournaling } from "#tree/journaling.ts";
import { SessionTreeLedger } from "#tree/ledger/service.ts";

const reopening = (nativeRef: string, seen: AgentEvent): AgentEvent => ({
	nativeRef,
	raw: observed("session/reopened", { node: nativeRef, seen: seen.type }),
	type: "session.opened",
});

// Providers may redrive existing children after reconnect; durable references prevent duplicate rows.
export const makeSessionTreeReopen = Effect.gen(function* () {
	const db = yield* Database;
	const journal = yield* SessionEventJournal;
	const journaling = yield* makeSessionTreeJournaling;
	const ledger = yield* SessionTreeLedger;
	const reopenRow = (sessionId: string) =>
		db.AgentSession.where({ id: sessionId }).update({ completeness: "recording", status: "open" }).pipe(Effect.asVoid);
	return (rootSessionId: string, tree: Ref.Ref<SessionTree>) => (subsessionRef: string, spawnedBy: string, seen: AgentEvent) =>
		Effect.gen(function* () {
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
				rows: reopenRow(node.sessionId),
			});
			yield* Ref.update(tree, withNode(node, spawnedBy));
			yield* journaling.settle(node, event, recorded);
			return node;
		});
});
