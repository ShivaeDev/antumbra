import type { UsageEvent } from "@antumbra/vocabulary/session-events";

type Usage = typeof UsageEvent.Type;

const money = (usd: number): string => `$${usd.toFixed(4)}`;

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
	...(event.model === undefined ? [] : [event.model]),
	`in ${event.inputTokens}`,
	...(event.cacheReadTokens === undefined ? [] : [`cache read ${event.cacheReadTokens}`]),
	...(event.cacheWriteTokens === undefined ? [] : [`cache write ${event.cacheWriteTokens}`]),
	`out ${event.outputTokens}`,
];

const costs = (event: Usage): ReadonlyArray<string> => [
	...(event.costUsd === undefined ? [] : [`turn ${money(event.costUsd)}`]),
	...(event.cumulativeCostUsd === undefined ? [] : [`total ${money(event.cumulativeCostUsd)}`]),
];

export const usageFacts = (event: Usage): ReadonlyArray<string> => [...tokens(event), ...costs(event)];

export const usageLabel = (event: Usage): string => ["usage", ...tokens(event), ...share(event), ...costs(event)].join(" · ");
