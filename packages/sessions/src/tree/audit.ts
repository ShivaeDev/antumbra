import type { StoredAgentSession } from "@antumbra/persistence";
import type { SessionAudit } from "@antumbra/plugin-api";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import { decodeStoredAgentSessionCompleteness } from "@antumbra/vocabulary/agent-runtime";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Result } from "effect";
import { makeSessionTreeLedger } from "#tree/ledger.ts";

const auditable = (node: StoredAgentSession): boolean => {
	const completeness = decodeStoredAgentSessionCompleteness(node.id, node.completeness);
	return node.status === "closed" && Result.isSuccess(completeness) && completeness.success !== "unaudited";
};

export const makeSessionTreeAudits = Effect.gen(function* () {
	const journal = yield* SessionEventJournal;
	const ledger = yield* makeSessionTreeLedger;
	const project = (sessionId: string) =>
		Effect.gen(function* () {
			const gaps = yield* ledger.gapKinds(sessionId);
			yield* ledger.settle(sessionId, gaps.length === 0 ? "complete" : "incomplete");
		});
	const journalOn = (sessionId: string, findings: ReadonlyArray<AgentEvent>) =>
		Effect.forEach(findings, (event) => journal.record(sessionId, event), {
			concurrency: 1,
			discard: true,
		});
	const findings = (lane: SessionAudit, root: StoredAgentSession, node: StoredAgentSession) =>
		Effect.gen(function* () {
			if (root.nativeRef === null || node.nativeRef === null) {
				return [];
			}
			const recorded = yield* ledger.recorded(node.id);
			return yield* lane.node({
				cwd: root.cwd,
				nodeRef: node.nativeRef,
				recorded: Effect.succeed(recorded),
				rootRef: root.nativeRef,
			});
		});
	const audit = (lane: SessionAudit, root: StoredAgentSession, node: StoredAgentSession) =>
		Effect.gen(function* () {
			if (!auditable(node)) {
				return;
			}
			yield* journalOn(node.id, yield* findings(lane, root, node));
			yield* project(node.id);
		});
	return { audit, journalOn, project };
});
