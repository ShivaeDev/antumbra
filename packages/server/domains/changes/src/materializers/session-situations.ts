import { pieceAgent } from "@antumbra/domain-agents/rows/piece-agent.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import type { ChangeSituation } from "@antumbra/platform-vocabulary/change.ts";
import { situationWords } from "@antumbra/platform-vocabulary/change-situations.ts";
import { Effect } from "effect";
import { change } from "#rows/change.ts";
import { type ChangeFeedbackRow, changeFeedback } from "#rows/change-feedback.ts";
import { pieceChange } from "#rows/piece-change.ts";
import { sessionSituation } from "#rows/session-situation.ts";

const ORDER: Readonly<Record<ChangeFeedbackRow["kind"], number>> = { review: 0, inline: 1, comment: 2 };

const unchanged = (before: typeof sessionSituation.Row.Type, row: typeof sessionSituation.Row.Type): boolean =>
	before.text === row.text &&
	before.reference === row.reference &&
	before.label === row.label &&
	before.feedbackIds.join() === row.feedbackIds.join();

const oldestFirst = (left: ChangeFeedbackRow, right: ChangeFeedbackRow): number =>
	left.at === right.at ? ORDER[left.kind] - ORDER[right.kind] : left.at.localeCompare(right.at);

const situations = (held: typeof change.Row.Type, waiting: readonly ChangeFeedbackRow[]) => {
	const kinds: ChangeSituation[] = [];
	if (held.mergeable === "conflict") kinds.push("merge_conflicts");
	if (held.checks === "red") kinds.push("checks_failed");
	if (held.review === "changes_requested") kinds.push("unresolved_reviews");
	if (waiting.length > 0) kinds.push("feedback_waiting");
	return kinds;
};
const forSession = (
	root: typeof session.Row.Type,
	held: typeof change.Row.Type | undefined,
	repositories: ReadonlyMap<string, typeof repo.Row.Type>,
	waiting: readonly ChangeFeedbackRow[],
): readonly (typeof sessionSituation.Row.Type)[] => {
	if (held === undefined || held.externalId === null) return [];
	const reference = `#${held.externalId}`;
	const input = {
		baseRef: held.baseRef,
		feedback: waiting,
		headRef: held.headRef,
		reference,
		repo: repositories.get(held.repoId)?.name ?? held.repoId,
	};
	return situations(held, waiting).map((situation) => {
		const words = situationWords[situation](input);
		return {
			id: `${root.id}/${held.id}/${situation}`,
			sessionId: root.id,
			changeId: held.id,
			reference,
			situation,
			label: words.label,
			text: words.text,
			feedbackIds: situation === "feedback_waiting" ? waiting.map((item) => item.id) : [],
		};
	});
};
export const sessionSituationsProjection = projection("sessionSituations", {
	reads: [session, pieceAgent, pieceChange, change, changeFeedback, repo, sessionSituation],
	writes: [sessionSituation],
	run: Effect.fn("changes.sessionSituationsProjection")(function* (reads, writes) {
		const agents = Map.groupBy(yield* reads.pieceAgent.where({}), (row) => String(row.agentId));
		const links = Map.groupBy(yield* reads.pieceChange.where({ purpose: "produces" }), (row) => String(row.pieceId));
		const changes = new Map((yield* reads.change.where({ stage: "open" })).map((row) => [row.id, row]));
		const repositories = new Map((yield* reads.repo.where({})).map((row) => [row.id, row]));
		const unforwarded = Map.groupBy(yield* reads.changeFeedback.where({ forwardedAt: null }), (row) => String(row.changeId));
		const desired = (yield* reads.session.where({ status: "open" })).flatMap((root) => {
			const ids = new Set((agents.get(root.agentId) ?? []).flatMap((assigned) => (links.get(assigned.pieceId) ?? []).map((link) => link.changeId)));
			return [...ids].flatMap((id) => forSession(root, changes.get(id), repositories, [...(unforwarded.get(id) ?? [])].sort(oldestFirst)));
		});
		const current = new Map((yield* reads.sessionSituation.where({})).map((row) => [row.id, row]));
		const wanted = new Set(desired.map((row) => row.id));
		for (const row of current.values()) if (!wanted.has(row.id)) yield* writes.sessionSituation.delete(row.id);
		for (const row of desired) {
			const before = current.get(row.id);
			if (before === undefined) yield* writes.sessionSituation.insert(row);
			else if (!unchanged(before, row)) yield* writes.sessionSituation.update(row.id, row);
		}
	}),
});
