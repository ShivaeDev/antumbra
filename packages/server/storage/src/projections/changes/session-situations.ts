import type { change } from "@antumbra/domain-changes/rows/change.ts";
import type { ChangeFeedbackRow } from "@antumbra/domain-changes/rows/change-feedback.ts";
import type { sessionSituation } from "@antumbra/domain-changes/rows/session-situation.ts";
import type { repo } from "@antumbra/domain-repos/rows/repo.ts";
import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import type { ChangeSituation } from "@antumbra/platform-vocabulary/change.ts";
import { situationWords } from "@antumbra/platform-vocabulary/change-situations.ts";
import { selection as changeSelection } from "@antumbra/server-storage/records/change.ts";
import { selection as changeFeedbackSelection } from "@antumbra/server-storage/records/change-feedback.ts";
import { selection as pieceAgentSelection } from "@antumbra/server-storage/records/piece-agent.ts";
import { selection as pieceChangeSelection } from "@antumbra/server-storage/records/piece-change.ts";
import { selection as repoSelection } from "@antumbra/server-storage/records/repo.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as sessionSituationSelection } from "@antumbra/server-storage/records/session-situation.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

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
export const sessionSituationsProjection = Effect.fn("changes.sessionSituationsProjection")(function* (): Effect.fn.Return<void, never, Records> {
	const reads = yield* Records;
	const writes = yield* Records;

	const agents = Map.groupBy(
		yield* reads.pieceAgent
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: pieceAgentSelection })
			.pipe(Effect.orDie),
		(row) => String(row.agentId),
	);
	const links = Map.groupBy(
		yield* reads.pieceChange
			.findMany({ where: { purpose: "produces" }, orderBy: { field: "storage_order", direction: "asc" }, select: pieceChangeSelection })
			.pipe(Effect.orDie),
		(row) => String(row.pieceId),
	);
	const changes = new Map(
		(yield* reads.change
			.findMany({ where: { stage: "open" }, orderBy: { field: "storage_order", direction: "asc" }, select: changeSelection })
			.pipe(Effect.orDie)).map((row) => [row.id, row]),
	);
	const repositories = new Map(
		(yield* reads.repo.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: repoSelection }).pipe(Effect.orDie)).map(
			(row) => [row.id, row],
		),
	);
	const unforwarded = Map.groupBy(
		yield* reads.changeFeedback
			.findMany({ where: { forwardedAt: null }, orderBy: { field: "storage_order", direction: "asc" }, select: changeFeedbackSelection })
			.pipe(Effect.orDie),
		(row) => String(row.changeId),
	);
	const desired = (yield* reads.session
		.findMany({ where: { status: "open" }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie)).flatMap((root) => {
		const ids = new Set((agents.get(root.agentId) ?? []).flatMap((assigned) => (links.get(assigned.pieceId) ?? []).map((link) => link.changeId)));
		return [...ids].flatMap((id) => forSession(root, changes.get(id), repositories, [...(unforwarded.get(id) ?? [])].sort(oldestFirst)));
	});
	const current = new Map(
		(yield* reads.sessionSituation
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSituationSelection })
			.pipe(Effect.orDie)).map((row) => [row.id, row]),
	);
	const wanted = new Set(desired.map((row) => row.id));
	for (const row of current.values()) if (!wanted.has(row.id)) yield* writes.sessionSituation.delete(row.id).pipe(Effect.orDie);
	for (const row of desired) {
		const before = current.get(row.id);
		if (before === undefined) yield* writes.sessionSituation.insertVoid(row).pipe(Effect.orDie);
		else if (!unchanged(before, row)) yield* writes.sessionSituation.updateVoid({ ...row, id: row.id }).pipe(Effect.orDie);
	}
});
