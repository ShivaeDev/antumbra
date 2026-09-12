import type { Ruling } from "#rows/ruling.ts";

const binds = { piece: "one piece", voyage: "the whole voyage", fleet: "the whole fleet" };
const waits = {
	blocking: "the asker is held until this is ruled",
	pressing: "the asker works on; what the ruling gates waits",
	eventual: "nothing waits on it",
};
export const ascentWords = (ruling: Ruling): string => {
	const requester = ruling.requester.kind === "agent" ? ruling.requester.agentId : ruling.requester.by;
	const recommendation = ruling.recommendation;
	const chosen = ruling.choices.find((choice) => choice.id === recommendation?.choiceId)?.label;
	return [
		`${requester} asks for a ruling that would bind ${binds[ruling.radius]} — ${waits[ruling.urgency]}.`,
		`Question: ${ruling.question}`,
		`Context: ${ruling.context}`,
		...(ruling.choices.length === 0
			? []
			: ["Choices offered:", ...ruling.choices.map((choice) => `- ${choice.label}${choice.detail === null ? "" : ` — ${choice.detail}`}`)]),
		...(recommendation === null ? [] : [`${requester} would choose "${chosen ?? recommendation.choiceId}": ${recommendation.reasoning}`]),
		`Rule on it with rule_on, naming ruling ${ruling.id}. If it is not yours to settle, pass_up carries it to the rung above with what you know.`,
	].join("\n");
};
