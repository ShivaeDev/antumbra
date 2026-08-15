import { describe, expect, it } from "vitest";
import { cpuHeadroom, maxConcurrency, ramHeadroom, settle } from "#gate.ts";

describe("maxConcurrency", () => {
	it("admits below the limit and blocks at it", () => {
		const gate = maxConcurrency(2);
		expect(gate.admits({ millisSinceLastChange: 0, runningCount: 0 })).toBe(
			true,
		);
		expect(gate.admits({ millisSinceLastChange: 0, runningCount: 1 })).toBe(
			true,
		);
		expect(gate.admits({ millisSinceLastChange: 0, runningCount: 2 })).toBe(
			false,
		);
	});

	it("never asks for a timed retry", () => {
		expect(maxConcurrency(2).retryAfterMillis).toBeUndefined();
	});
});

describe("settle", () => {
	it("blocks until the quiet window has elapsed", () => {
		const gate = settle(100);
		expect(gate.admits({ millisSinceLastChange: 99, runningCount: 0 })).toBe(
			false,
		);
		expect(gate.admits({ millisSinceLastChange: 100, runningCount: 0 })).toBe(
			true,
		);
	});

	it("asks to retry after the remaining quiet time, never sooner than 1ms", () => {
		const gate = settle(100);
		expect(
			gate.retryAfterMillis?.({ millisSinceLastChange: 40, runningCount: 0 }),
		).toBe(60);
		expect(
			gate.retryAfterMillis?.({ millisSinceLastChange: 100, runningCount: 0 }),
		).toBe(1);
	});
});

describe("headroom stubs", () => {
	it("always admit until real measurement backends exist", () => {
		const snapshot = { millisSinceLastChange: 0, runningCount: 1000 };
		expect(ramHeadroom().admits(snapshot)).toBe(true);
		expect(cpuHeadroom().admits(snapshot)).toBe(true);
	});
});
