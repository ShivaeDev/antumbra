import type { ChangeSituation } from "@antumbra/vocabulary/change.ts";
import type { ChangeRow } from "#change-rows.ts";

export interface AddressableChange {
	readonly changeId: string;
	readonly reference: string;
	readonly situation: ChangeSituation;
}

export const situationsOf = (change: ChangeRow): ReadonlyArray<AddressableChange> => {
	if (change.stage !== "open" || change.externalId === null) {
		return [];
	}
	const kinds: ReadonlyArray<ChangeSituation> = [
		...(change.mergeable === "conflict" ? (["merge_conflicts"] as const) : []),
		...(change.checks === "red" ? (["checks_failed"] as const) : []),
		...(change.review === "changes_requested" ? (["unresolved_reviews"] as const) : []),
	];
	return kinds.map((situation) => ({ changeId: change.id, reference: `#${change.externalId}`, situation }));
};
