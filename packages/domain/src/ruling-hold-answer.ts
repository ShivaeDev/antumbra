import type { RuledRuling } from "@antumbra/rulings/holds/ruled";
import { rulingAnswerMail } from "#ruling-answer-mail.ts";

export const heldSaid = ({ answer, ruling }: RuledRuling): string => `Ruled — your hold is over.\n${rulingAnswerMail(ruling, answer)}`;
