import { expect, it } from "vitest";
import { listPrice } from "#session-events/prices.ts";

const MILLION = { cacheReadTokens: 1_000_000, cacheWriteTokens: 1_000_000, inputTokens: 1_000_000, outputTokens: 1_000_000 };

it("charges a million of each kind of token at that kind's published rate", () => {
	expect(listPrice("gpt-5.6-luna", MILLION)).toBeCloseTo(0.4 + 1.8 + 0.04 + 0.5, 6);
	expect(listPrice("claude-sonnet-5", MILLION)).toBeCloseTo(2 + 10 + 0.2 + 2.5, 6);
});

it("counts only the tokens a turn reports", () => {
	expect(listPrice("gpt-6-astra", { inputTokens: 200_000, outputTokens: 100_000 })).toBeCloseTo(2 + 5, 6);
});

it("bills a round past the context threshold at the long rates", () => {
	const short = { cacheReadTokens: 0, cacheWriteTokens: 0, inputTokens: 272_000, outputTokens: 0 };
	const long = { ...short, inputTokens: 272_001 };
	expect(listPrice("gpt-6-astra", short)).toBeCloseTo(2.72, 6);
	expect(listPrice("gpt-6-astra", long)).toBeCloseTo(5.44002, 6);
});

it("keeps the short rates at any size for a model that publishes no long ones", () => {
	const long = { inputTokens: 400_000, outputTokens: 0 };
	expect(listPrice("gpt-5.6-cyber", long)).toBeCloseTo(5, 6);
	expect(listPrice("claude-opus-5", long)).toBeCloseTo(2, 6);
});

it("prices a model by what it is, not by the provider it was reached through", () => {
	expect(listPrice("anthropic/claude-opus-5", MILLION)).toEqual(listPrice("claude-opus-5", MILLION));
});

it("reports no price for a model outside the list", () => {
	expect(listPrice("gpt-6-astra-safe", MILLION)).toBeUndefined();
});
