import {
	rulingRadiusRank,
	rulingUrgencyRank,
} from "@antumbra/vocabulary/ruling";
import type { Ruling } from "#model.ts";

// why: the open set is met in the order it should be answered — what holds an
// asker first, then what binds most widely, then what has waited longest.
const RANKS: ReadonlyArray<(ruling: Ruling) => number> = [
	(ruling) => rulingUrgencyRank(ruling.urgency),
	(ruling) => rulingRadiusRank(ruling.radius),
	(ruling) => ruling.createdAt.getTime(),
];

export const inOpenOrder = (left: Ruling, right: Ruling): number => {
	for (const rank of RANKS) {
		const difference = rank(left) - rank(right);
		if (difference !== 0) {
			return difference;
		}
	}
	return 0;
};
