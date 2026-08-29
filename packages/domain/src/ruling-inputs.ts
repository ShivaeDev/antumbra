import type { RulingChoiceInput, RulingSubject } from "@antumbra/rulings";

// why: an absent detail is left off rather than carried as an empty one, so a
// choice written from the wire is the shape a choice written in code is.
export const choiceOf = (choice: {
	readonly detail?: string | undefined;
	readonly label: string;
}): RulingChoiceInput =>
	choice.detail === undefined
		? { label: choice.label }
		: { detail: choice.detail, label: choice.label };

export const tagSubjects = (
	tags: ReadonlyArray<string> | undefined,
): ReadonlyArray<RulingSubject> =>
	(tags ?? []).map((tag) => ({ kind: "tag", tag }));
