import type { PieceCounts } from "@antumbra/contract";
import { cn } from "#lib/utils.ts";
import {
	landedLabel,
	type ProgressBand,
	type ProgressSlice,
	progressLabel,
	slicesOf,
} from "#voyages/progress.ts";

// why: the bar and its legend take their fills from one table, so a dot in the
// legend is the same colour as the run of bar it explains.
const FILL: Readonly<Record<ProgressBand, string>> = {
	active: "bg-success",
	landed: "bg-muted-foreground",
	ready: "bg-info",
};

const BAND_LABEL: Readonly<Record<ProgressBand, string>> = {
	active: "active",
	landed: "landed",
	ready: "ready",
};

const LegendEntry = ({ slice }: { readonly slice: ProgressSlice }) => (
	<span className="flex items-center gap-1">
		<span className={cn("size-1.5 rounded-full", FILL[slice.band])} />
		<span className="tabular-nums">
			{slice.count} {BAND_LABEL[slice.band]}
		</span>
	</span>
);

export const VoyageProgress = ({
	counts,
	withLegend = false,
}: {
	readonly counts: PieceCounts;
	readonly withLegend?: boolean;
}) => {
	const slices = slicesOf(counts);
	if (counts.pieces === 0) {
		return (
			<p className="text-2xs text-muted-foreground">Nothing chartered yet</p>
		);
	}
	const legend = withLegend
		? slices.filter((slice) => slice.band !== "landed")
		: [];
	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<div
				aria-label={progressLabel(counts)}
				className="flex h-1 w-full gap-px overflow-hidden rounded-full bg-muted"
				role="img"
			>
				{slices.map((slice) => (
					<span
						className={cn("h-full", FILL[slice.band])}
						key={slice.band}
						style={{ width: `${slice.share * 100}%` }}
					/>
				))}
			</div>
			<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-2xs text-muted-foreground">
				<span className="tabular-nums">{landedLabel(counts)}</span>
				{legend.map((slice) => (
					<LegendEntry key={slice.band} slice={slice} />
				))}
			</div>
		</div>
	);
};
