import type { Ruling } from "#rows/ruling.ts";

export const answerWords = (ruling: Ruling): string => {
	const answer = ruling.answer;
	if (answer === null) return "Not ruled yet";
	const chosen = ruling.choices.find((choice) => choice.id === answer.choiceId);
	return [
		`You asked: ${ruling.question}`,
		`Answer: ${answer.text}`,
		...(chosen === undefined ? [] : [`Chosen: ${chosen.label}`]),
		`Ruled by ${answer.by} at ${answer.at}.`,
		`Ruling ${ruling.id}.`,
	].join("\n");
};
export const questionBackWords = (ruling: Ruling, note: string): string =>
	[
		`The admiral asks about your request, and has not ruled: ${note}`,
		`You asked: ${ruling.question}`,
		`Answer with add_context, naming ruling ${ruling.id}.`,
	].join("\n");
export const notNowWords = (ruling: Ruling, note: string): string =>
	[
		`Not now: ${note}`,
		`You asked: ${ruling.question}`,
		`Ruling ${ruling.id} stays open and waits for a later moment. Work on what does not need the answer.`,
	].join("\n");
export const rulingBlock = (ruling: Ruling): string =>
	[`## ${ruling.id} — binds ${ruling.radius}`, `Question: ${ruling.question}`, `Context: ${ruling.context}`, `Answer: ${answerWords(ruling)}`].join(
		"\n",
	);
