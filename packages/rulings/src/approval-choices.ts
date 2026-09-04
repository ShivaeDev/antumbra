import type { RulingChoiceInput } from "#acts.ts";

export const APPROVE = "approve";
export const REDIRECT = "redirect";

export const APPROVAL_CHOICES: ReadonlyArray<RulingChoiceInput> = [
	{ detail: "The plot stands: these pieces are the approved set until the next approval supersedes it.", label: APPROVE },
	{ detail: "The plot is turned back with your words beside it; the captain re-plots and asks again.", label: REDIRECT },
];

export const APPROVAL_QUESTION = "Approve this plot?";
