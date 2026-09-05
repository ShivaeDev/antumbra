import { Option } from "effect";
import type { RulingAnswer } from "#model.ts";

export const ruledByWords = (answer: RulingAnswer): string =>
	answer.by === "captain"
		? Option.match(answer.byAgentId, {
				onNone: () => "a captain",
				onSome: (agentId) => `captain ${agentId}`,
			})
		: `the ${answer.by}`;
