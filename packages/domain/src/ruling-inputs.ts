import type { ProclaimRequest, ReclassifyRequest, RuleRequest } from "@antumbra/contract";
import type { RulingChoiceInput, RulingProclamation, RulingReclassifyInput, RulingSubject, RulingVerdict } from "@antumbra/rulings";

// why: an absent detail is left off rather than carried as an empty one, so a
// choice written from the wire is the shape a choice written in code is.
export const choiceOf = (choice: { readonly detail?: string | undefined; readonly label: string }): RulingChoiceInput =>
	choice.detail === undefined ? { label: choice.label } : { detail: choice.detail, label: choice.label };

export const tagSubjects = (tags: ReadonlyArray<string> | undefined): ReadonlyArray<RulingSubject> =>
	(tags ?? []).map((tag) => ({ kind: "tag", tag }));

// why: the window is the admiral's hand, so what it sends is ruled by the
// admiral — no other authority sits on the ladder yet. A choice nobody picked
// is left off the verdict rather than carried as an empty one.
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

// why: the admiral proclaiming from the window is the asker as well as the
// authority, and it stands on no piece or voyage while it writes a rule — so
// free tags are the whole of the scope a proclamation may name.
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
