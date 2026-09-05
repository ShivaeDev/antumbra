import type { UsageTotal } from "@antumbra/contract";

const UNITS = ["", "K", "M", "B"] as const;
const PARTIAL_TITLE = "Some turns reported no cost, so the real total is higher.";
const ABSENT_TITLE = "No turn in this total reported a cost.";

export const tokensOf = (total: UsageTotal): number => total.inputTokens + total.outputTokens + total.cacheReadTokens + total.cacheWriteTokens;

export const exactTokens = (count: number): string => count.toLocaleString("en-US");

const decimals = (scaled: number): number => {
	if (scaled >= 100) {
		return 0;
	}
	return scaled >= 10 ? 1 : 2;
};

export const compactTokens = (count: number): string => {
	const step = Math.min(Math.floor(Math.log10(Math.max(count, 1)) / 3), UNITS.length - 1);
	const scaled = count / 1000 ** step;
	return `${Number(scaled.toFixed(decimals(scaled)))}${UNITS[step]}`;
};

const grouped = (usd: number, digits: number): string =>
	usd.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });

export const money = (usd: number): string => `$${grouped(usd, usd >= 1 ? 2 : 4)}`;

export const axisMoney = (usd: number): string => `$${grouped(usd, [0, 2, 3, 4].find((digits) => Number(usd.toFixed(digits)) === usd) ?? 4)}`;

const amount = (total: UsageTotal): string | undefined =>
	total.costUsd === null ? undefined : `${total.costPartial ? "≥ " : ""}${money(total.costUsd)}`;

export const costCell = (total: UsageTotal): string => amount(total) ?? "not reported";

export const costPhrase = (total: UsageTotal): string => amount(total) ?? "cost not reported";

export const costReported = (total: UsageTotal): boolean => total.costUsd !== null;

export const costTitle = (total: UsageTotal): string | undefined => {
	if (total.costUsd === null) {
		return ABSENT_TITLE;
	}
	return total.costPartial ? PARTIAL_TITLE : undefined;
};

export const tokensTitle = (total: UsageTotal): string =>
	[
		`${exactTokens(total.turns)} turns`,
		`input ${exactTokens(total.inputTokens)}`,
		`cache read ${exactTokens(total.cacheReadTokens)}`,
		`cache write ${exactTokens(total.cacheWriteTokens)}`,
		`output ${exactTokens(total.outputTokens)}`,
	].join(" · ");
