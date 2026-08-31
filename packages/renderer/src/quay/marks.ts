import type { ChangeView } from "@antumbra/contract";

type MarkTone = "destructive" | "info" | "muted" | "success" | "warning";

export interface ChangeMark {
	readonly key: string;
	readonly label: string;
	readonly tone: MarkTone;
}

const CHECK_MARKS: Readonly<Record<ChangeView["checks"], ChangeMark>> = {
	green: { key: "checks", label: "checks passed", tone: "success" },
	none: { key: "checks", label: "no checks", tone: "muted" },
	pending: { key: "checks", label: "checks running", tone: "warning" },
	red: { key: "checks", label: "checks failed", tone: "destructive" },
};

const REVIEW_MARKS: Readonly<Record<ChangeView["review"], ChangeMark>> = {
	approved: { key: "review", label: "approved", tone: "success" },
	changes_requested: {
		key: "review",
		label: "changes requested",
		tone: "warning",
	},
	none: { key: "review", label: "no review", tone: "muted" },
	pending: { key: "review", label: "review pending", tone: "info" },
};

const MERGE_MARKS: Readonly<Record<ChangeView["mergeable"], ChangeMark>> = {
	clean: { key: "merge", label: "merges cleanly", tone: "success" },
	conflict: { key: "merge", label: "conflicts", tone: "destructive" },
	unknown: { key: "merge", label: "merge untested", tone: "muted" },
};

const STAGE_ALONE: Readonly<Partial<Record<ChangeView["stage"], ChangeMark>>> = {
	landed: { key: "stage", label: "merged", tone: "muted" },
	prepared: { key: "stage", label: "not offered yet", tone: "muted" },
	withdrawn: {
		key: "stage",
		label: "closed without merging",
		tone: "destructive",
	},
};

export const changeMarks = (change: ChangeView): ReadonlyArray<ChangeMark> => {
	const alone = STAGE_ALONE[change.stage];
	if (alone !== undefined) {
		return [alone];
	}
	return [CHECK_MARKS[change.checks], REVIEW_MARKS[change.review], MERGE_MARKS[change.mergeable]];
};

export const changeNumber = (change: ChangeView): string => (change.externalId === null ? "" : `#${change.externalId}`);
