import { rulingAnswerMail } from "@antumbra/rulings/delivery/answer-mail";
import type { RuledRuling } from "@antumbra/rulings/holds/ruled";

export const heldSaid = ({ answer, ruling }: RuledRuling): string => `Ruled — your hold is over.\n${rulingAnswerMail(ruling, answer)}`;
