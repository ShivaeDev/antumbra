import type { Ruling, RulingAnswer } from "@antumbra/rulings";
import { Option } from "effect";
import { ruledByWords } from "#ruling-words.ts";

const labelOf = (ruling: Ruling, choiceId: string): string =>
	ruling.choices.find((choice) => choice.id === choiceId)?.label ?? choiceId;

// why: an answer read apart from its question loses the scope that bounds it,
// so the mail carries both — the asker meets the ruling whole, long after the
// turn that asked for it has ended.
export const rulingAnswerMail = (
	ruling: Ruling,
	answer: RulingAnswer,
): string =>
	[
		`You asked: ${ruling.question}`,
		`Answer: ${answer.text}`,
		...Option.match(answer.choiceId, {
			onNone: (): ReadonlyArray<string> => [],
			onSome: (choiceId) => [`Chosen: ${labelOf(ruling, choiceId)}`],
		}),
		`Ruled by ${ruledByWords(answer)} at ${answer.at.toISOString()}.`,
		`Ruling ${ruling.id}.`,
	].join("\n");
