import type { UsageEvidence } from "@antumbra/domain-sessions/rows/usage-evidence.ts";
import { money } from "#costs/format.ts";

type Usage = UsageEvidence;

export const cacheShare = (event: Usage): number | undefined => {
	if (event.cacheReadTokens === undefined) {
		return undefined;
	}
	const supplied = event.inputTokens + event.cacheReadTokens + (event.cacheWriteTokens ?? 0);
	return supplied === 0 ? undefined : event.cacheReadTokens / supplied;
};

const share = (event: Usage): ReadonlyArray<string> => {
	const fraction = cacheShare(event);
	return fraction === undefined ? [] : [`${Math.round(fraction * 100)}% cache`];
};

const tokens = (event: Usage): ReadonlyArray<string> => [
	...event.byModel.map((spent) => spent.model),
	`in ${event.inputTokens}`,
	...(event.cacheReadTokens === undefined ? [] : [`cache read ${event.cacheReadTokens}`]),
	...(event.cacheWriteTokens === undefined ? [] : [`cache write ${event.cacheWriteTokens}`]),
	`out ${event.outputTokens}`,
];

const turnCost = (event: Usage): ReadonlyArray<string> => (event.costUsd === undefined ? [] : [`turn ${money(event.costUsd)}`]);

const costs = (event: Usage): ReadonlyArray<string> => [
	...turnCost(event),
	...(event.cumulativeCostUsd === undefined ? [] : [`session ${money(event.cumulativeCostUsd)}`]),
];

// What a session has spent is summed from the models that ran, so the standing bar reads the turn's own cost only.
export const usageFacts = (event: Usage): ReadonlyArray<string> => [...tokens(event), ...turnCost(event)];

export const usageLabel = (event: Usage): string => ["usage", ...tokens(event), ...share(event), ...costs(event)].join(" · ");
