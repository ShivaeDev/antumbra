import { Database, type StoredAgentSession } from "@antumbra/persistence";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option } from "effect";
import { makeSessionTreeAudits } from "#session-tree-audit.ts";
import {
	endingUnreportedGap,
	observed,
	processGoneGap,
} from "#session-tree-gaps.ts";
import { makeSessionTreeLedger } from "#session-tree-ledger.ts";
import { acquisitionGone, type Spawner } from "#session-tree-liveness.ts";
import { makeSessionTreeRows } from "#session-tree-rows.ts";

// why: the outcome is unknown and nothing else. Absence is not completion: a
// node the record stopped hearing from may have finished, failed or been
// killed, and the one thing this can say honestly is that it never found out.
const reconciledEnding = (
	subsessionRef: string,
	sessionId: string,
): AgentEvent => ({
	outcome: "unknown",
	raw: observed("session/reconciled", { sessionId, subsessionRef }),
	subsessionRef,
	type: "subsession.ended",
});

// why: the ending is a fact about the turn that spawned the node, so it lands in
// that turn's journal. A node whose provider reference was never mirrored onto
// its row has no name to end, and only the loss on its own key is written.
const endings = (node: StoredAgentSession, spawnerSessionId: string) =>
	node.nativeRef === null
		? []
		: [
				{
					event: reconciledEnding(node.nativeRef, node.id),
					sessionId: spawnerSessionId,
				},
			];

export const makeSessionNodeReconciler = Effect.gen(function* () {
	const db = yield* Database;
	const journal = yield* SessionEventJournal;
	const audits = yield* makeSessionTreeAudits;
	const ledger = yield* makeSessionTreeLedger;
	const rows = yield* makeSessionTreeRows;
	const spawners = db.Agent.all().pipe(
		Effect.map((all) =>
			Option.some<ReadonlyMap<string, Spawner>>(
				new Map(all.map((agent) => [agent.id, agent])),
			),
		),
		Effect.catchCause((cause) =>
			Effect.logError(
				"the Agents owning open subsessions could not be read at startup",
				cause,
			).pipe(Effect.as(Option.none<ReadonlyMap<string, Spawner>>())),
		),
	);
	// why: the row closes and the two facts that explain it are journaled in one
	// transaction — the ending in the journal of the turn that spawned the node,
	// the loss on the node's own key. A ledger that cannot be read leaves the
	// node open rather than closing it on a gap set nobody could see.
	const close = (node: StoredAgentSession) =>
		Effect.gen(function* () {
			const gaps = yield* ledger.gapKinds(node.id);
			const spawnerSessionId = node.parentSessionId;
			if (Option.isNone(gaps) || spawnerSessionId === null) {
				return;
			}
			const gap = gaps.value.includes("stream-detached")
				? endingUnreportedGap(node.id)
				: processGoneGap(node.id);
			yield* journal.recordTogether({
				appends: [
					...endings(node, spawnerSessionId),
					{ event: gap, sessionId: node.id },
				],
				rows: rows.closeNode(node.id, "unknown"),
			});
			yield* audits.project(node.id);
		});
	// why: whether a node's acquisition can ever come back is a question about its
	// root and the Agent that holds it, so both are read before anything closes,
	// and an undecidable answer leaves the node exactly as it stands.
	const settle = (
		node: StoredAgentSession,
		owners: ReadonlyMap<string, Spawner>,
	) =>
		rows
			.rootRow(node.rootSessionId)
			.pipe(
				Effect.flatMap((root) =>
					acquisitionGone(Option.getOrUndefined(root), owners.get(node.agentId))
						? close(node)
						: Effect.void,
				),
			);
	return Effect.gen(function* () {
		const nodes = yield* ledger.openNodes;
		if (nodes.length === 0) {
			return;
		}
		const owners = yield* spawners;
		if (Option.isNone(owners)) {
			return;
		}
		yield* Effect.forEach(nodes, (node) => settle(node, owners.value), {
			concurrency: 1,
			discard: true,
		});
	});
});
