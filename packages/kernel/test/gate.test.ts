import { describe, expect, it } from "vitest";
import type { AdmissionSnapshot } from "#gate.ts";
import {
	cpuHeadroom,
	gaugeCeiling,
	maxConcurrency,
	ramHeadroom,
	settle,
} from "#gate.ts";

const snapshot = (
	partial: Partial<AdmissionSnapshot> = {},
): AdmissionSnapshot => ({
	millisSinceLastChange: 0,
	readings: {},
	runningCount: 0,
	...partial,
});

describe("maxConcurrency", () => {
	it("admits below the limit and blocks at it", () => {
		const gate = maxConcurrency(2);
		expect(gate.admits(snapshot({ runningCount: 0 }))).toBe(true);
		expect(gate.admits(snapshot({ runningCount: 1 }))).toBe(true);
		expect(gate.admits(snapshot({ runningCount: 2 }))).toBe(false);
	});

	it("never asks for a timed retry", () => {
		expect(maxConcurrency(2).retryAfterMillis).toBeUndefined();
	});
});

describe("settle", () => {
	it("blocks until the quiet window has elapsed", () => {
		const gate = settle(100);
		expect(gate.admits(snapshot({ millisSinceLastChange: 99 }))).toBe(false);
		expect(gate.admits(snapshot({ millisSinceLastChange: 100 }))).toBe(true);
	});

	it("asks to retry after the remaining quiet time, never sooner than 1ms", () => {
		const gate = settle(100);
		expect(
			gate.retryAfterMillis?.(snapshot({ millisSinceLastChange: 40 })),
		).toBe(60);
		expect(
			gate.retryAfterMillis?.(snapshot({ millisSinceLastChange: 100 })),
		).toBe(1);
	});
});

describe("gaugeCeiling", () => {
	it("admits below the limit, blocks at it, treats a missing reading as zero", () => {
		const gate = gaugeCeiling("agents.alive", 2);
		expect(gate.admits(snapshot({ readings: { "agents.alive": 1 } }))).toBe(
			true,
		);
		expect(gate.admits(snapshot({ readings: { "agents.alive": 2 } }))).toBe(
			false,
		);
		expect(gate.admits(snapshot())).toBe(true);
	});

	it("never asks for a timed retry", () => {
		expect(gaugeCeiling("x", 1).retryAfterMillis).toBeUndefined();
	});
});

describe("headroom stubs", () => {
	it("always admit until real measurement backends exist", () => {
		expect(ramHeadroom().admits(snapshot({ runningCount: 1000 }))).toBe(true);
		expect(cpuHeadroom().admits(snapshot({ runningCount: 1000 }))).toBe(true);
	});
});
