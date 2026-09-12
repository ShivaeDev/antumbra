import type { Ruling } from "@antumbra/domain-rulings/rows/ruling.ts";

const reach = { fleet: "binds the whole fleet", piece: "binds one piece", voyage: "binds one voyage" };
export const rulingLine = (ruling: Ruling): string => {
	const asked = ruling.requester.kind === "authority" ? `proclaimed by the ${ruling.requester.by}` : `asked by ${ruling.requester.agentId}`;
	const answer = ruling.answer;
	if (answer === null) return `- ${ruling.id} (${reach[ruling.radius]}, ${asked}) ${ruling.question} — not ruled yet`;
	const choice = ruling.choices.find((candidate) => candidate.id === answer.choiceId);
	const chosen = choice === undefined ? "" : ` (chose: ${choice.label})`;
	let author = `the ${answer.by}`;
	if (answer.by === "captain") author = answer.byAgentId === null ? "a captain" : `captain ${answer.byAgentId}`;
	return `- ${ruling.id} (${reach[ruling.radius]}, ${asked}) ${ruling.question} — ${answer.text}${chosen} — ruled by ${author} on ${answer.at}`;
};
