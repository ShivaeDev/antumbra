import { Database, type StoredAgentSession } from "@antumbra/persistence";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option } from "effect";
import { makeSessionTreeAudits } from "#tree/audit.ts";
import { endingUnreportedGap, observed, processGoneGap } from "#tree/gaps.ts";
import { makeSessionTreeLedger } from "#tree/ledger.ts";
import { acquisitionGone, type Spawner } from "#tree/liveness.ts";
import { makeSessionTreeRows } from "#tree/rows.ts";

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

export const makeSessionNodeReconciler = Effect.gen(function* () {
	const db = yield* Database;
	const journal = yield* SessionEventJournal;
	const audits = yield* makeSessionTreeAudits;
	const ledger = yield* makeSessionTreeLedger;
	const rows = yield* makeSessionTreeRows;
	const close = (node: StoredAgentSession) =>
		Effect.gen(function* () {
			const gaps = yield* ledger.gapKinds(node.id);
			const spawnerSessionId = node.parentSessionId;
			if (spawnerSessionId === null) {
				return;
			}
			const gap = gaps.includes("stream-detached") ? endingUnreportedGap(node.id) : processGoneGap(node.id);
			yield* journal.recordTogether({
				appends: [...endings(node, spawnerSessionId), { event: gap, sessionId: node.id }],
				rows: rows.closeNode(node.id, "unknown"),
			});
			yield* audits.project(node.id);
		});
	const settle = (node: StoredAgentSession, owners: ReadonlyMap<string, Spawner>) =>
		rows
			.rootRow(node.rootSessionId)
			.pipe(Effect.flatMap((root) => (acquisitionGone(Option.getOrUndefined(root), owners.get(node.agentId)) ? close(node) : Effect.void)));
	return Effect.gen(function* () {
		const nodes = yield* ledger.openNodes;
		if (nodes.length === 0) {
			return;
		}
		const agents = yield* db.Agent.where((agent) => agent.id.in(nodes.map((node) => node.agentId)))
			.select("id", "status", "currentSessionId")
			.all();
		const owners: ReadonlyMap<string, Spawner> = new Map(agents.map((agent) => [agent.id, agent]));
		yield* Effect.forEach(nodes, (node) => settle(node, owners), {
			concurrency: 1,
			discard: true,
		});
	});
});
