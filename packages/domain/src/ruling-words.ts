import type { RulingAnswer } from "@antumbra/rulings";
import type { RulingRadius } from "@antumbra/vocabulary/ruling";
import { Option } from "effect";

export const ruledByWords = (answer: RulingAnswer): string =>
	answer.by === "captain"
		? Option.match(answer.byAgentId, {
				onNone: () => "a captain",
				onSome: (agentId) => `captain ${agentId}`,
			})
		: `the ${answer.by}`;

export const bindsWords: Readonly<Record<RulingRadius, string>> = {
	fleet: "the whole fleet",
	piece: "one piece",
	voyage: "one voyage",
};
