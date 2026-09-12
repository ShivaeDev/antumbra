import { type Bar, barsOf, type Column, seriesOpacity } from "#costs/series.ts";

export const PLOT_HEIGHT = 112;
const SLOT = 24;
const SIDE = 2;
const SEGMENT_GAP = 1;

const Rule = ({ width, y }: { readonly width: number; readonly y: number }) => <rect className="fill-border" height={1} width={width} x={0} y={y} />;

const Segment = ({
	bar,
	order,
	slot,
	tip,
}: {
	readonly bar: Bar;
	readonly order: ReadonlyArray<string>;
	readonly slot: number;
	readonly tip: string;
}) => (
	<rect
		className="fill-foreground"
		fillOpacity={seriesOpacity(order.indexOf(bar.backend))}
		height={bar.height}
		width={SLOT - SIDE * 2}
		x={slot * SLOT + SIDE}
		y={bar.y}
	>
		<title>{tip}</title>
	</rect>
);

export const CostsPlot = ({
	columns,
	label,
	max,
	order,
	tip,
	ticks,
}: {
	readonly columns: ReadonlyArray<Column>;
	readonly label: string;
	readonly max: number;
	readonly order: ReadonlyArray<string>;
	readonly tip: (column: Column, bar: Bar) => string;
	readonly ticks: readonly [string, string];
}) => (
	<div className="flex min-w-0 items-stretch gap-2">
		<div className="relative w-12 shrink-0 text-2xs text-muted-foreground tabular-nums">
			<span className="-translate-y-1/2 absolute top-0 right-0">{ticks[0]}</span>
			<span className="-translate-y-1/2 absolute top-1/2 right-0">{ticks[1]}</span>
		</div>
		<svg
			aria-label={label}
			className="min-w-0 flex-1"
			height={PLOT_HEIGHT}
			preserveAspectRatio="none"
			role="img"
			viewBox={`0 0 ${SLOT * columns.length} ${PLOT_HEIGHT}`}
		>
			<Rule width={SLOT * columns.length} y={0} />
			<Rule width={SLOT * columns.length} y={PLOT_HEIGHT / 2} />
			<Rule width={SLOT * columns.length} y={PLOT_HEIGHT - 1} />
			{columns.map((column, slot) =>
				barsOf(column, max, PLOT_HEIGHT, SEGMENT_GAP).map((bar) => (
					<Segment bar={bar} key={`${column.day}-${bar.backend}`} order={order} slot={slot} tip={tip(column, bar)} />
				)),
			)}
		</svg>
	</div>
);
