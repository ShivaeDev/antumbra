import type { UsageEvent } from "@antumbra/vocabulary/session-events";

type Usage = typeof UsageEvent.Type;

const money = (usd: number): string => `$${usd.toFixed(4)}`;

// why: the share of everything that went in that came back out of the cache.
// The denominator is all three input kinds, because that is the number a
// reader is comparing against — 94% cache on a resume says the context was
// there, and the same turn's fresh-input count alone says nothing.
export const cacheShare = (event: Usage): number | undefined => {
	if (event.cacheReadTokens === undefined) {
		return undefined;
	}
	const supplied =
		event.inputTokens + event.cacheReadTokens + (event.cacheWriteTokens ?? 0);
	return supplied === 0 ? undefined : event.cacheReadTokens / supplied;
};

const share = (event: Usage): ReadonlyArray<string> => {
	const fraction = cacheShare(event);
	return fraction === undefined ? [] : [`${Math.round(fraction * 100)}% cache`];
};

// why: every category the providers report, spelled out rather than added up.
// Fresh input, a cache read and a cache write are billed at three different
// rates, so a single input number hides the one thing worth knowing about a
// resumed turn. A category the provider did not report is left out entirely —
// printing it as zero would claim the turn wrote no cache when the truth is
// that nobody said.
export const usageLabel = (event: Usage): string =>
	[
		"usage",
		...(event.model === undefined ? [] : [event.model]),
		`in ${event.inputTokens}`,
		...(event.cacheReadTokens === undefined
			? []
			: [`cache read ${event.cacheReadTokens}`]),
		...(event.cacheWriteTokens === undefined
			? []
			: [`cache write ${event.cacheWriteTokens}`]),
		`out ${event.outputTokens}`,
		...share(event),
		...(event.costUsd === undefined ? [] : [`turn ${money(event.costUsd)}`]),
		...(event.cumulativeCostUsd === undefined
			? []
			: [`total ${money(event.cumulativeCostUsd)}`]),
	].join(" · ");
