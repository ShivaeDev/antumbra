import { pieceAgent } from "@antumbra/domain-agents/rows/piece-agent.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { checksFailed, mergeConflicts, unresolvedReviews } from "@antumbra/platform-prompts/situations.ts";
import type { ChangeSituation } from "@antumbra/platform-vocabulary/change.ts";
import { Effect } from "effect";
import { change } from "#rows/change.ts";
import { pieceChange } from "#rows/piece-change.ts";
import { sessionSituation } from "#rows/session-situation.ts";

const words = { merge_conflicts: mergeConflicts, checks_failed: checksFailed, unresolved_reviews: unresolvedReviews };
const situations = (held: typeof change.Row.Type) => {
	const kinds: ChangeSituation[] = [];
	if (held.mergeable === "conflict") kinds.push("merge_conflicts");
	if (held.checks === "red") kinds.push("checks_failed");
	if (held.review === "changes_requested") kinds.push("unresolved_reviews");
	return kinds;
};
const forSession = (
	root: typeof session.Row.Type,
	held: typeof change.Row.Type | undefined,
	repositories: ReadonlyMap<string, typeof repo.Row.Type>,
): readonly (typeof sessionSituation.Row.Type)[] => {
	if (held === undefined || held.externalId === null) return [];
	const reference = `#${held.externalId}`;
	return situations(held).map((situation) => ({
		id: `${root.id}/${held.id}/${situation}`,
		sessionId: root.id,
		changeId: held.id,
		reference,
		situation,
		text: words[situation]({ reference, repo: repositories.get(held.repoId)?.name ?? held.repoId, headRef: held.headRef, baseRef: held.baseRef }),
	}));
};
export const sessionSituationsProjection = projection("sessionSituations", {
	reads: [session, pieceAgent, pieceChange, change, repo, sessionSituation],
	writes: [sessionSituation],
	run: Effect.fn("changes.sessionSituationsProjection")(function* (reads, writes) {
		const agents = Map.groupBy(yield* reads.pieceAgent.where({}), (row) => String(row.agentId));
		const links = Map.groupBy(yield* reads.pieceChange.where({ purpose: "produces" }), (row) => String(row.pieceId));
		const changes = new Map((yield* reads.change.where({ stage: "open" })).map((row) => [row.id, row]));
		const repositories = new Map((yield* reads.repo.where({})).map((row) => [row.id, row]));
		const desired = (yield* reads.session.where({ status: "open" })).flatMap((root) => {
			const ids = new Set((agents.get(root.agentId) ?? []).flatMap((assigned) => (links.get(assigned.pieceId) ?? []).map((link) => link.changeId)));
			return [...ids].flatMap((id) => forSession(root, changes.get(id), repositories));
		});
		const current = new Map((yield* reads.sessionSituation.where({})).map((row) => [row.id, row]));
		const wanted = new Set(desired.map((row) => row.id));
		for (const row of current.values()) if (!wanted.has(row.id)) yield* writes.sessionSituation.delete(row.id);
		for (const row of desired) {
			const before = current.get(row.id);
			if (before === undefined) yield* writes.sessionSituation.insert(row);
			else if (before.text !== row.text || before.reference !== row.reference) yield* writes.sessionSituation.update(row.id, row);
		}
	}),
});
