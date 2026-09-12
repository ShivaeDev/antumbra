import type { Observation } from "@antumbra/platform-vocabulary/change-host.ts";
import { Schema } from "effect";
import { submissionKey } from "#commands/prepare.ts";
import { ChangeId } from "#ids.ts";
import type { ChangeRow } from "#rows/change.ts";
export const Attachment = Schema.Union([
	Schema.Struct({ _tag: Schema.Literal("Observed") }),
	Schema.Struct({ _tag: Schema.Literal("ExternalOnly") }),
	Schema.Struct({ _tag: Schema.Literal("Claimed"), changeId: ChangeId, agentId: Schema.String, submissionKey: Schema.String }),
]);
export type Attachment = typeof Attachment.Type;
export const selectObservation = (changes: readonly ChangeRow[], host: string, seen: Observation, attachment: Attachment) => {
	const external = changes.find((row) => row.host === host && row.repoId === seen.repoId && row.externalId === seen.externalId);
	const candidates =
		seen.headSha === null
			? []
			: changes.filter(
					(row) =>
						row.host === host &&
						row.repoId === seen.repoId &&
						row.stage === "prepared" &&
						row.externalId === null &&
						row.preparedHeadRef === seen.headRef &&
						row.preparedHeadSha === seen.headSha &&
						row.openedByAgentId !== null &&
						row.submissionKey === submissionKey(row.openedByAgentId, row.repoId),
				);
	const matches = (row: ChangeRow) =>
		attachment._tag === "Claimed" &&
		row.id === attachment.changeId &&
		row.openedByAgentId === attachment.agentId &&
		row.submissionKey === attachment.submissionKey;
	if (external !== undefined && candidates.length > 0) return { _tag: "Collision" as const };
	if (external !== undefined && attachment._tag === "Claimed" && !matches(external)) return { _tag: "Conflict" as const };
	let prepared: ChangeRow | undefined;
	if (attachment._tag === "Observed" && candidates.length === 1) prepared = candidates[0];
	if (attachment._tag === "Claimed") prepared = candidates.find(matches);
	if (attachment._tag !== "Observed" && external === undefined && prepared === undefined && candidates.length > 0)
		return { _tag: "Conflict" as const };
	return { _tag: "Selected" as const, row: external ?? prepared };
};
export const projectObservation = (row: ChangeRow, seen: Observation, now: string): ChangeRow => ({
	...row,
	activityAt: new Date(seen.activityAt).toISOString(),
	baseRef: seen.baseRef,
	checks: seen.checks,
	draftAt: seen.isDraft ? (row.draftAt ?? now) : null,
	externalId: seen.externalId,
	headRef: seen.headRef,
	headSha: seen.headSha,
	landedAt: seen.stage === "landed" ? (row.landedAt ?? now) : null,
	observedAt: now,
	raw: JSON.stringify(seen.raw) ?? null,
	review: seen.review,
	mergeable: seen.mergeable,
	stage: seen.stage,
	submissionKey: seen.stage === "open" ? row.submissionKey : null,
	title: seen.title,
	url: seen.url,
	withdrawnAt: seen.stage === "withdrawn" ? (row.withdrawnAt ?? now) : null,
});
export const sameEvidence = (left: ChangeRow, right: ChangeRow): boolean =>
	JSON.stringify({ ...left, observedAt: "" }) === JSON.stringify({ ...right, observedAt: "" });
