import type { PieceCounts } from "@antumbra/contract";
import { describe, expect, it } from "vitest";
import { landedLabel, progressLabel, slicesOf } from "#voyages/progress.ts";

const counts = (pieces: number, done: number, active: number, ready: number): PieceCounts => ({ active, done, pieces, ready });

describe("slicesOf", () => {
	it("turns the counts into shares of one bar, landed first", () => {
		expect(slicesOf(counts(8, 4, 2, 2))).toEqual([
			{ band: "landed", count: 4, share: 0.5 },
			{ band: "active", count: 2, share: 0.25 },
			{ band: "ready", count: 2, share: 0.25 },
		]);
	});

	it("leaves out a band with nothing in it rather than drawing a zero", () => {
		expect(slicesOf(counts(2, 0, 2, 0)).map((slice) => slice.band)).toEqual(["active"]);
	});

	it("leaves the rest of the bar unfilled when work is neither of the three", () => {
		const filled = slicesOf(counts(4, 1, 0, 0));
		expect(filled.map((slice) => slice.share)).toEqual([0.25]);
	});

	it("a voyage with nothing chartered has no bar to draw", () => {
		expect(slicesOf(counts(0, 0, 0, 0))).toEqual([]);
	});
});

describe("landedLabel", () => {
	it("reads as a fraction of the whole rather than a run of arithmetic", () => {
		expect(landedLabel(counts(8, 4, 2, 2))).toBe("4 of 8 landed");
		expect(landedLabel(counts(2, 0, 2, 0))).toBe("0 of 2 landed");
	});
});

describe("progressLabel", () => {
	it("spells the bar out for a reader who cannot see it", () => {
		expect(progressLabel(counts(8, 4, 2, 2))).toBe("4 of 8 landed, 2 active, 2 ready");
	});

	it("says only what there is, so no band is announced as none", () => {
		expect(progressLabel(counts(2, 0, 2, 0))).toBe("0 of 2 landed, 2 active");
	});
});
