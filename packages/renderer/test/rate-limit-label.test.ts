import { describe, expect, it } from "vitest";
import { rateLimitLabel } from "#transcript/rate-limit-label.ts";

const raw = { kind: "rate_limit_event", payload: "{}", source: "claude" };

describe("rateLimitLabel", () => {
	it("names each window by its length and says the share of it spent", () => {
		expect(
			rateLimitLabel({
				raw,
				status: "allowed",
				type: "rate.limit",
				windows: [
					{ durationMinutes: 300, usedPercent: 42 },
					{ durationMinutes: 10080, usedPercent: 7 },
				],
			}),
		).toBe("rate limit · 42% of 5h window · 7% of 7d window");
	});

	it("says when a window resets, as a clock time, and which model it meters", () => {
		const label = rateLimitLabel({
			raw,
			status: "warning",
			type: "rate.limit",
			windows: [
				{
					durationMinutes: 10080,
					model: "opus",
					resetsAt: 1787180346000,
					usedPercent: 91,
				},
			],
		});
		expect(label).toMatch(/^rate limit nearing · 91% of 7d opus window, resets \d{1,2}:\d{2}/);
	});

	it("a share with no window behind it is a share of the limit; a verdict alone stands", () => {
		expect(
			rateLimitLabel({
				raw,
				status: "allowed",
				type: "rate.limit",
				windows: [{ usedPercent: 10 }, { durationMinutes: 90, usedPercent: 3 }],
			}),
		).toBe("rate limit · 10% of limit · 3% of 90m window");
		expect(
			rateLimitLabel({
				raw,
				status: "rejected",
				type: "rate.limit",
				windows: [],
			}),
		).toBe("rate limit reached");
	});

	it("does not invent an account verdict when a provider only reports usage", () => {
		expect(
			rateLimitLabel({
				raw,
				status: "unknown",
				type: "rate.limit",
				windows: [{ durationMinutes: 300, usedPercent: 42 }],
			}),
		).toBe("rate limit · 42% of 5h window");
	});
});
