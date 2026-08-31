import type { ProclaimRequest, ReclassifyRequest, RuleRequest } from "@antumbra/contract";
import type { RulingChoiceInput, RulingProclamation, RulingReclassifyInput, RulingSubject, RulingVerdict } from "@antumbra/rulings";

export const choiceOf = (choice: { readonly detail?: string | undefined; readonly label: string }): RulingChoiceInput =>
	choice.detail === undefined ? { label: choice.label } : { detail: choice.detail, label: choice.label };

export const tagSubjects = (tags: ReadonlyArray<string> | undefined): ReadonlyArray<RulingSubject> =>
	(tags ?? []).map((tag) => ({ kind: "tag", tag }));

export const verdictOf = (request: RuleRequest): RulingVerdict =>
	request.choiceId === undefined
		? {
				answer: request.answer,
				by: "admiral",
				rulingId: request.rulingId,
			}
		: {
				answer: request.answer,
				by: "admiral",
				choiceId: request.choiceId,
				rulingId: request.rulingId,
			};

export const proclamationOf = (request: ProclaimRequest): RulingProclamation => ({
	answer: request.answer,
	by: "admiral",
	choices: (request.choices ?? []).map(choiceOf),
	context: request.context,
	question: request.question,
	radius: request.radius,
	subjects: tagSubjects(request.tags),
	urgency: request.urgency,
	...(request.chosenChoice === undefined ? {} : { chosenChoice: request.chosenChoice }),
});

export const reclassificationOf = (request: ReclassifyRequest): RulingReclassifyInput => ({
	by: "admiral",
	rulingId: request.rulingId,
	...(request.note === undefined ? {} : { note: request.note }),
	...(request.radius === undefined ? {} : { radius: request.radius }),
	...(request.urgency === undefined ? {} : { urgency: request.urgency }),
});
