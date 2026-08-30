import { ChangeChecks, ChangeMergeable, ChangeReview, ChangeStage } from "@antumbra/vocabulary/change";
import { Effect, Schema } from "effect";
import type { ChangeRow } from "#change-rows.ts";
import { StoredChangeInvalid } from "#errors.ts";

// why: persistence stores these words as text, but their meaning is closed.
// Decode them together at the read boundary so no consumer can receive a
// partly valid Change or mistake corruption for a cautious domain fact.
const StoredChangeVocabulary = Schema.Struct({
	checks: ChangeChecks,
	mergeable: ChangeMergeable,
	review: ChangeReview,
	stage: ChangeStage,
});

type StoredChange = Omit<ChangeRow, "checks" | "mergeable" | "review" | "stage"> & {
	readonly checks: string;
	readonly mergeable: string;
	readonly review: string;
	readonly stage: string;
};

export const changeRow = (row: StoredChange) =>
	Schema.decodeUnknownEffect(StoredChangeVocabulary)({
		checks: row.checks,
		mergeable: row.mergeable,
		review: row.review,
		stage: row.stage,
	}).pipe(
		Effect.mapError(
			(cause) =>
				new StoredChangeInvalid({
					changeId: row.id,
					detail: `${String(cause)}; stored vocabulary ${JSON.stringify({
						checks: row.checks,
						mergeable: row.mergeable,
						review: row.review,
						stage: row.stage,
					})}`,
				}),
		),
		Effect.map(
			(vocabulary): ChangeRow => ({
				activityAt: row.activityAt,
				baseRef: row.baseRef,
				body: row.body,
				checks: vocabulary.checks,
				draftAt: row.draftAt,
				externalId: row.externalId,
				headRef: row.headRef,
				headSha: row.headSha,
				host: row.host,
				id: row.id,
				landedAt: row.landedAt,
				mergeable: vocabulary.mergeable,
				observedAt: row.observedAt,
				openedByAgentId: row.openedByAgentId,
				originSessionId: row.originSessionId,
				preparedHeadRef: row.preparedHeadRef,
				preparedHeadSha: row.preparedHeadSha,
				proposalFrozenAt: row.proposalFrozenAt,
				raw: row.raw,
				repoId: row.repoId,
				review: vocabulary.review,
				stage: vocabulary.stage,
				submissionKey: row.submissionKey,
				title: row.title,
				url: row.url,
				withdrawnAt: row.withdrawnAt,
				workingDiff: row.workingDiff,
				workingTreeStatus: row.workingTreeStatus,
				worktreePath: row.worktreePath,
			}),
		),
	);
