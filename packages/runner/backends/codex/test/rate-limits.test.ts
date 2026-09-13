import { describe, expect, it } from "vitest";
import { toAgentEvents } from "#mapping.ts";

const MODEL = "gpt-6-astra";

const updated = (rateLimits: Record<string, unknown>) => ({
	method: "account/rateLimits/updated",
	params: { rateLimits },
});

const both = {
	limitId: "codex",
	limitName: null,
	planType: "plus",
	primary: { resetsAt: 1787180346, usedPercent: 42, windowDurationMins: 300 },
	rateLimitReachedType: null,
	secondary: {
		resetsAt: 1787700000,
		usedPercent: 7,
		windowDurationMins: 10080,
	},
};

describe("codex's account rate limits are telemetry, not raw", () => {
	it("both windows are read, primary first, into minutes and an epoch", () => {
		const notification = updated(both);
		expect(toAgentEvents(notification, MODEL)).toEqual([
			{
				raw: {
					kind: "account/rateLimits/updated",
					payload: JSON.stringify(notification.params),
					source: "codex",
				},
				status: "unknown",
				type: "rate.limit",
				windows: [
					{ durationMinutes: 300, resetsAt: 1787180346000, usedPercent: 42 },
					{ durationMinutes: 10080, resetsAt: 1787700000000, usedPercent: 7 },
				],
			},
		]);
	});

	it("a reached limit is a rejection whatever the reason", () => {
		expect(toAgentEvents(updated({ ...both, rateLimitReachedType: "rate_limit_reached" }), MODEL)).toMatchObject([
			{ status: "rejected", type: "rate.limit" },
		]);
	});

	it("an update with no snapshot in it stays raw", () => {
		expect(toAgentEvents({ method: "account/rateLimits/updated", params: {} }, MODEL)).toMatchObject([
			{ raw: { kind: "account/rateLimits/updated" }, type: "raw" },
		]);
	});
});
