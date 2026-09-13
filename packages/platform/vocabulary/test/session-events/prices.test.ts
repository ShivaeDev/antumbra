import { expect, it } from "vitest";
import { listPrice, PRICED_MODELS } from "#session-events/prices.ts";

const MILLION = { cacheReadTokens: 1_000_000, cacheWriteTokens: 1_000_000, inputTokens: 1_000_000, outputTokens: 1_000_000 };

it("prices every model the published lists name, and no others", () => {
	expect(PRICED_MODELS).toEqual([
		"claude-fable-5",
		"claude-fable-5-1",
		"claude-haiku-4-5",
		"claude-opus-4-1",
		"claude-opus-4-5",
		"claude-opus-4-6",
		"claude-opus-4-7",
		"claude-opus-4-8",
		"claude-opus-5",
		"claude-sonnet-4-5",
		"claude-sonnet-4-6",
		"claude-sonnet-5",
		"gpt-5.6-cyber",
		"gpt-5.6-luna",
		"gpt-5.6-sol",
		"gpt-5.6-terra",
		"gpt-6-astra",
	]);
});

it("charges a million of each kind of token at that kind's published rate", () => {
	expect(listPrice("gpt-6-astra", MILLION)).toBeCloseTo(10 + 50 + 1 + 12.5, 6);
	expect(listPrice("claude-sonnet-5", MILLION)).toBeCloseTo(2 + 10 + 0.2 + 2.5, 6);
});

it("counts only the tokens a turn reports", () => {
	expect(listPrice("gpt-6-astra", { inputTokens: 500_000, outputTokens: 200_000 })).toBeCloseTo(5 + 10, 6);
});

it("prices a model by what it is, not by the provider it was reached through", () => {
	expect(listPrice("anthropic/claude-opus-5", MILLION)).toEqual(listPrice("claude-opus-5", MILLION));
});

it("reports no price for a model outside the list", () => {
	expect(listPrice("gpt-6-astra-safe", MILLION)).toBeUndefined();
});
