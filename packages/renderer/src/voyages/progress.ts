import type { PieceCounts } from "@antumbra/contract";

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

export const slicesOf = (counts: PieceCounts): ReadonlyArray<ProgressSlice> => {
	if (counts.pieces <= 0) return [];
	return BANDS.map((band) => ({
		band,
		count: countIn(counts, band),
		share: countIn(counts, band) / counts.pieces,
	})).filter((slice) => slice.count > 0);
};

export const landedLabel = (counts: PieceCounts): string => `${counts.done} of ${counts.pieces} landed`;

export const progressLabel = (counts: PieceCounts): string =>
	[
		landedLabel(counts),
		...slicesOf(counts)
			.filter((slice) => slice.band !== "landed")
			.map((slice) => `${slice.count} ${slice.band}`),
	].join(", ");
