import type { ChangeObservation } from "@antumbra/plugin-api";
import type { ChangeRow } from "#change-rows.ts";

export const rawText = (payload: unknown): string | null =>
	JSON.stringify(payload) ?? null;

export const projectedChange = (
	row: ChangeRow,
	observation: ChangeObservation,
	now: number,
): ChangeRow => ({
	...row,
	activityAt: new Date(observation.activityAt),
	baseRef: observation.baseRef,
	checks: observation.checks,
	draftAt: observation.isDraft ? (row.draftAt ?? new Date(now)) : null,
	headRef: observation.headRef,
	headSha: observation.headSha,
	landedAt:
		observation.stage === "landed" ? (row.landedAt ?? new Date(now)) : null,
	mergeable: observation.mergeable,
	observedAt: new Date(now),
	raw: rawText(observation.raw),
	review: observation.review,
	stage: observation.stage,
	title: observation.title,
	url: observation.url,
	withdrawnAt:
		observation.stage === "withdrawn"
			? (row.withdrawnAt ?? new Date(now))
			: null,
});

// why: the id is the provider fact rather than the time we happened to hear
// it, so replaying one observation names one immutable event. It can later be
// used directly as an event-mail source reference.
export const stageTransition = (before: ChangeRow, after: ChangeRow) => ({
	activityAt: after.activityAt,
	changeId: before.id,
	fromStage: before.stage,
	id: `${before.id}:${after.activityAt.getTime()}:${after.stage}`,
	observedAt: after.observedAt,
	toStage: after.stage,
});
