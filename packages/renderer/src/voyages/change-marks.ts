import type { ChangeView } from "@antumbra/contract";

// why: the host's dialect already reached the window as one vocabulary, so a
// word this build does not know shows as nothing rather than a wrong mark.
const CHECK_MARKS: Readonly<Record<string, string>> = {
	green: "✓",
	none: "○",
	pending: "…",
	red: "✗",
};

const REVIEW_MARKS: Readonly<Record<string, string>> = {
	approved: "✓",
	changes_requested: "✎",
	pending: "…",
};

const MERGEABLE_MARKS: Readonly<Record<string, string>> = {
	clean: "⚓",
	conflict: "⚡",
};

const mark = (marks: Readonly<Record<string, string>>, word: string): string =>
	marks[word] ?? "";

// why: a landed change has nothing left to say about checks or reviewers — it
// merged, and that is the whole of its state.
export const changeMarks = (change: ChangeView): string => {
	if (change.stage === "landed") {
		return "✓ merged";
	}
	return [
		change.stage,
		mark(CHECK_MARKS, change.checks),
		mark(REVIEW_MARKS, change.review),
		mark(MERGEABLE_MARKS, change.mergeable),
	]
		.filter((glyph) => glyph !== "")
		.join(" · ");
};

// why: a change that never reached a host has no number to show, so it is
// named by its title alone rather than by a number nobody can look up.
export const changeName = (change: ChangeView): string =>
	change.externalId === null
		? change.title
		: `#${change.externalId} ${change.title}`;
