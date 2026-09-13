import type { UsageEvent } from "@antumbra/platform-vocabulary/session-events/usage.ts";

const money = (usd: number): string =>
	`$${usd.toLocaleString("en-US", { minimumFractionDigits: usd >= 1 ? 2 : 4, maximumFractionDigits: usd >= 1 ? 2 : 4 })}`;

const counted = (tokens: number): string => tokens.toLocaleString("en-US");

type Usage = typeof UsageEvent.Type;

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

export const turnModels = (event: Usage): ReadonlyArray<string> => event.byModel.map((spent) => spent.model);

export const turnFacts = (event: Usage): ReadonlyArray<string> => [
	...(event.costUsd === undefined ? [] : [money(event.costUsd)]),
	...share(event),
	`in ${counted(event.inputTokens)}`,
	`out ${counted(event.outputTokens)}`,
];

export const turnDetail = (event: Usage): string | undefined => {
	const facts = [
		...(event.cacheReadTokens === undefined ? [] : [`cache read ${counted(event.cacheReadTokens)}`]),
		...(event.cacheWriteTokens === undefined ? [] : [`cache write ${counted(event.cacheWriteTokens)}`]),
		...(event.cumulativeCostUsd === undefined ? [] : [`session ${money(event.cumulativeCostUsd)} so far`]),
	];
	return facts.length === 0 ? undefined : facts.join(" · ");
};
