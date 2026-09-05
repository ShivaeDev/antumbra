import { rulingAnswerMail } from "@antumbra/rulings/delivery/answer-mail";
import type { RulingHeldEnd } from "@antumbra/rulings/holds/held";
import { notNowWords, questionBackWords } from "@antumbra/rulings/replies/words";

export const heldSaid = (end: RulingHeldEnd): string => {
	switch (end._tag) {
		case "asked":
			return questionBackWords(end.ruling, end.note);
		case "parked":
			return notNowWords(end.ruling, end.note);
		default:
			return `Ruled — your hold is over.\n${rulingAnswerMail(end.ruling, end.answer)}`;
	}
};
