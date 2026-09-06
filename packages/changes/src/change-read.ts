import { ChangeChecks, ChangeMergeable, ChangeReview, ChangeStage } from "@antumbra/vocabulary/change.ts";
import { Effect, Schema } from "effect";
import type { ChangeRow } from "#change-rows.ts";
import { StoredChangeInvalid } from "#errors.ts";

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
		Effect.map((vocabulary): ChangeRow => ({ ...row, ...vocabulary })),
	);
