import type { StoredAgentSession } from "@antumbra/persistence";
import type { SessionAudit } from "@antumbra/plugin-api";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import { decodeStoredAgentSessionCompleteness } from "@antumbra/vocabulary/agent-runtime";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option, Result } from "effect";
import { makeSessionTreeLedger } from "#session-tree-ledger.ts";

// why: an audit is a reading of stored evidence, so a node that is still being
// written to has nothing to audit yet, and a legacy row predates the gaps the
// projection is a function of — auditing it would assert evidence nobody has.
const auditable = (node: StoredAgentSession): boolean => {
	const completeness = decodeStoredAgentSessionCompleteness(
		node.id,
		node.completeness,
	);
	return (
		node.status === "closed" &&
		Result.isSuccess(completeness) &&
		completeness.success !== "unaudited"
	);
};

// why: completeness is a projection of the node's journaled gap ledger, not a
// judgement made at the moment of the close: empty is "complete", anything in
// it is "incomplete". Because it is a function of the ledger it can be run
// again — a later repair that resolves a gap re-audits the node forward, and
// nothing here has to remember what an earlier reading concluded.
export const makeSessionTreeAudits = Effect.gen(function* () {
	const journal = yield* SessionEventJournal;
	const ledger = yield* makeSessionTreeLedger;
	const project = (sessionId: string) =>
		Effect.gen(function* () {
			const gaps = yield* ledger.gapKinds(sessionId);
			if (Option.isNone(gaps)) {
				return;
			}
			yield* ledger.settle(
				sessionId,
				gaps.value.length === 0 ? "complete" : "incomplete",
			);
		});
	const journalOn = (sessionId: string, findings: ReadonlyArray<AgentEvent>) =>
		Effect.forEach(findings, (event) => journal.record(sessionId, event), {
			concurrency: 1,
			discard: true,
		});
	// why: the lane is asked first and the projection reads afterwards, so a gap
	// the audit itself discovered counts towards the answer. Both references have
	// to be known before the provider can be asked anything: without them there
	// is no node to ask about, and the projection stands on the ledger alone.
	const findings = (
		lane: SessionAudit,
		root: StoredAgentSession,
		node: StoredAgentSession,
	) =>
		root.nativeRef === null || node.nativeRef === null
			? Effect.succeed<ReadonlyArray<AgentEvent>>([])
			: lane.node({
					cwd: root.cwd,
					nodeRef: node.nativeRef,
					recorded: ledger.recorded(node.id),
					rootRef: root.nativeRef,
				});
	const audit = (
		lane: SessionAudit,
		root: StoredAgentSession,
		node: StoredAgentSession,
	) =>
		Effect.gen(function* () {
			if (!auditable(node)) {
				return;
			}
			yield* journalOn(node.id, yield* findings(lane, root, node));
			yield* project(node.id);
		});
	return { audit, journalOn, project };
});
