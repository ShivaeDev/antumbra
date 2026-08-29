import type { RulingAnswer } from "@antumbra/rulings";
import type { RulingRadius } from "@antumbra/vocabulary/ruling";
import { Option } from "effect";

// why: a captain is one of many, so naming the rung alone would leave a later
// reader unable to tell which ship's captain answered; the flagship and the
// admiral are each one office, and the office is the whole of who they are.
export const ruledByWords = (answer: RulingAnswer): string =>
	answer.by === "captain"
		? Option.match(answer.byAgentId, {
				onNone: () => "a captain",
				onSome: (agentId) => `captain ${agentId}`,
			})
		: `the ${answer.by}`;

// why: radius reaches an agent as how far the answer travels rather than as
// the word the record files it under, and every sentence that says it — mail,
// refusals, receipts — says it the same way.
export const bindsWords: Readonly<Record<RulingRadius, string>> = {
	fleet: "the whole fleet",
	piece: "one piece",
	voyage: "one voyage",
};
