import type { Ruling, RulingChoice } from "@antumbra/rulings";
import { bindsWords } from "#ruling-words.ts";

// why: urgency is what the rung needs first — it says whether an agent is
// standing still waiting for this answer or whether nothing waits at all.
const WAITING: Readonly<Record<Ruling["urgency"], string>> = {
	blocking: "the asker is held until this is ruled",
	eventual: "nothing waits on it",
	pressing: "the asker works on; what the ruling gates waits",
};

const choiceLine = (choice: RulingChoice): string =>
	choice.detail === null
		? `- ${choice.label}`
		: `- ${choice.label} — ${choice.detail}`;

const offered = (ruling: Ruling): ReadonlyArray<string> =>
	ruling.choices.length === 0
		? []
		: ["Choices offered:", ...ruling.choices.map(choiceLine)];

// why: a request climbs as mail, so the mail has to carry the whole ruling —
// the question, the context that gives an answer its meaning, and what the
// asker offered. A captain that has to go looking for the record before it can
// answer is a captain that answers late.
export const rulingAscentMail = (ruling: Ruling, askerId: string): string =>
	[
		`${askerId} asks for a ruling that would bind ${bindsWords[ruling.radius]} — ${WAITING[ruling.urgency]}.`,
		`Question: ${ruling.question}`,
		`Context: ${ruling.context}`,
		...offered(ruling),
		`Rule on it with rule_on, naming ruling ${ruling.id}. If it is not yours to settle, pass_up carries it to the rung above with what you know.`,
	].join("\n");
