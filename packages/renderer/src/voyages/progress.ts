import type { PieceCounts } from "@antumbra/contract";

// why: a reader wants to see how far a voyage has come before reading a
// number, so the counts become proportions of one bar. The bands are the three
// the counts carry; everything else is the part of the bar left unfilled,
// which is honest about being neither landed nor moving.
export type ProgressBand = "active" | "landed" | "ready";

export interface ProgressSlice {
	readonly band: ProgressBand;
	readonly count: number;
	readonly share: number;
}

const BANDS: ReadonlyArray<ProgressBand> = ["landed", "active", "ready"];

const countIn = (counts: PieceCounts, band: ProgressBand): number => {
	if (band === "landed") return counts.done;
	if (band === "active") return counts.active;
	return counts.ready;
};

// why: a band with nothing in it is left out rather than drawn as a zero-width
// sliver, which is the same reason the legend never says "0 ready".
export const slicesOf = (counts: PieceCounts): ReadonlyArray<ProgressSlice> => {
	if (counts.pieces <= 0) return [];
	return BANDS.map((band) => ({
		band,
		count: countIn(counts, band),
		share: countIn(counts, band) / counts.pieces,
	})).filter((slice) => slice.count > 0);
};

export const landedLabel = (counts: PieceCounts): string => `${counts.done} of ${counts.pieces} landed`;

// why: the bar carries no text, so the shape it draws is spelled out once for
// a reader who is listening to the page rather than looking at it.
export const progressLabel = (counts: PieceCounts): string =>
	[
		landedLabel(counts),
		...slicesOf(counts)
			.filter((slice) => slice.band !== "landed")
			.map((slice) => `${slice.count} ${slice.band}`),
	].join(", ");
