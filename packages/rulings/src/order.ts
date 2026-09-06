import { rulingRadiusRank, rulingUrgencyRank } from "@antumbra/vocabulary/ruling.ts";
import type { Ruling } from "#model.ts";

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
