import type { ChangeView } from "@antumbra/contract";

export type MarkTone = "destructive" | "info" | "muted" | "success" | "warning";

export interface ChangeMark {
	readonly key: string;
	readonly label: string;
	readonly tone: MarkTone;
}

// why: a change that merged is history the quay has no claim on, so it is
// drawn dimmed rather than ranked beside work someone is still waiting for.
export const hasLanded = (change: ChangeView): boolean =>
	change.stage === "landed";

// why: every state gets a word here, blanks included. A new vocabulary value
// is a compile error until the quay decides how it reads, rather than a state
// that silently draws nothing.
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

// why: a change that never reached a host, or was closed without merging, has
// nothing to report about checks or reviewers — where it stands is the whole
// of its state, and the three steps below would be three empty positions.
const STAGE_ALONE: Readonly<Partial<Record<ChangeView["stage"], ChangeMark>>> =
	{
		landed: { key: "stage", label: "merged", tone: "muted" },
		prepared: { key: "stage", label: "not offered yet", tone: "muted" },
		withdrawn: {
			key: "stage",
			label: "closed without merging",
			tone: "destructive",
		},
	};

// why: the same three steps in the same three places on every card — checks,
// then review, then the merge itself. A reader learns the positions once and
// afterwards reads a card by where the colour is rather than by the words.
export const changeMarks = (change: ChangeView): ReadonlyArray<ChangeMark> => {
	const alone = STAGE_ALONE[change.stage];
	if (alone !== undefined) {
		return [alone];
	}
	return [
		CHECK_MARKS[change.checks],
		REVIEW_MARKS[change.review],
		MERGE_MARKS[change.mergeable],
	];
};

// why: a change that never reached a host has no number to look up, so it is
// named by its title alone.
export const changeNumber = (change: ChangeView): string =>
	change.externalId === null ? "" : `#${change.externalId}`;
