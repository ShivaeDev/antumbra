import { Database, type StoredAgentSession } from "@antumbra/persistence";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option } from "effect";
import { SessionTreeAudits } from "#tree/audit/service.ts";
import { endingUnreportedGap, observed, processGoneGap } from "#tree/gaps.ts";
import { SessionTreeLedger } from "#tree/ledger/service.ts";
import { acquisitionGone, type Spawner } from "#tree/liveness.ts";
import { SessionTreeRows } from "#tree/rows/service.ts";

const reconciledEnding = (subsessionRef: string, sessionId: string): AgentEvent => ({
	outcome: "unknown",
	raw: observed("session/reconciled", { sessionId, subsessionRef }),
	subsessionRef,
	type: "subsession.ended",
});

const endings = (node: StoredAgentSession, spawnerSessionId: string) =>
	node.nativeRef === null
		? []
		: [
				{
					event: reconciledEnding(node.nativeRef, node.id),
					sessionId: spawnerSessionId,
				},
			];

export const reconcile = Effect.fn("SessionNodeReconciler.reconcile")(function* () {
	const db = yield* Database;
	const journal = yield* SessionEventJournal;
	const audits = yield* SessionTreeAudits;
	const ledger = yield* SessionTreeLedger;
	const rows = yield* SessionTreeRows;
	const nodes = yield* ledger.openNodes();
	if (nodes.length === 0) {
		return;
	}
	const agents = yield* db.Agent.where((agent) => agent.id.in(nodes.map((node) => node.agentId))).all();
	const owners: ReadonlyMap<string, Spawner> = new Map(agents.map((agent) => [agent.id, agent]));
	for (const node of nodes) {
		const root = yield* rows.rootRow(node.rootSessionId);
		if (!acquisitionGone(Option.getOrUndefined(root), owners.get(node.agentId))) {
			continue;
		}
		const gaps = yield* ledger.gapKinds(node.id);
		const spawnerSessionId = node.parentSessionId;
		if (spawnerSessionId === null) {
			continue;
		}
		const gap = gaps.includes("stream-detached") ? endingUnreportedGap(node.id) : processGoneGap(node.id);
		yield* journal.recordTogether({
			appends: [...endings(node, spawnerSessionId), { event: gap, sessionId: node.id }],
			rows: rows.closeNode(node.id, "unknown"),
		});
		yield* audits.project(node.id);
	}
});
