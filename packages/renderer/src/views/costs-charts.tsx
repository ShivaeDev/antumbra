import type { DaySpend } from "@antumbra/contract";
import { dayLabel, dayName } from "#costs/days.ts";
import { axisMoney, compactTokens, money } from "#costs/format.ts";
import { type Bar, backendsOf, type Column, columnsOf, niceMax, peakOf, seriesOpacity, unpricedIn } from "#costs/series.ts";
import { CostsPlot, PLOT_HEIGHT } from "#views/costs-plot.tsx";

const TICKS = [7, 14, 21, 28] as const;

const tokenTip = (column: Column, bar: Bar): string => `${dayName(column.day)} · ${bar.backend} · ${compactTokens(bar.value)} tokens`;

const costTip = (column: Column, bar: Bar): string => `${dayName(column.day)} · ${bar.backend} · ${bar.partial ? "≥ " : ""}${money(bar.value)}`;

const Legend = ({ days, order }: { readonly days: ReadonlyArray<DaySpend>; readonly order: ReadonlyArray<string> }) => (
	<div className="ml-auto flex flex-wrap items-center gap-3">
		{order.map((backend, index) => (
			<span className="flex items-center gap-1.5 text-2xs text-muted-foreground" key={backend}>
				<span className="size-2 rounded-sm bg-foreground" style={{ opacity: seriesOpacity(index) }} />
				{unpricedIn(days, backend) ? `${backend} · cost not reported` : backend}
			</span>
		))}
	</div>
);

const DayScale = ({ days }: { readonly days: ReadonlyArray<DaySpend> }) => (
	<div className="flex min-w-0 gap-2 pt-1">
		<span className="w-12 shrink-0" />
		<div className="relative h-4 min-w-0 flex-1 text-2xs text-muted-foreground tabular-nums">
			<span className="absolute right-0">today</span>
			{TICKS.map((back) => {
				const day = days[days.length - 1 - back];
				return day === undefined ? null : (
					<span className="-translate-x-1/2 absolute" key={day.day} style={{ left: `${((days.length - 0.5 - back) / days.length) * 100}%` }}>
						{dayLabel(day.day)}
					</span>
				);
			})}
		</div>
	</div>
);

const Unpriced = () => (
	<p className="flex items-center justify-center pl-14 text-2xs text-muted-foreground" style={{ height: PLOT_HEIGHT }}>
		No cost reported in the last 30 days
	</p>
);

const Plots = ({ days, order }: { readonly days: ReadonlyArray<DaySpend>; readonly order: ReadonlyArray<string> }) => {
	const tokens = columnsOf(days, order, "tokens");
	const cost = columnsOf(days, order, "cost");
	const tokenMax = niceMax(peakOf(tokens));
	const costPeak = peakOf(cost);
	const costMax = niceMax(costPeak);
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<span className="text-2xs text-muted-foreground">Tokens</span>
			<CostsPlot
				columns={tokens}
				label="Tokens per day by backend"
				max={tokenMax}
				order={order}
				ticks={[compactTokens(tokenMax), compactTokens(tokenMax / 2)]}
				tip={tokenTip}
			/>
			<span className="pt-3 text-2xs text-muted-foreground">Cost</span>
			{costPeak === 0 ? (
				<Unpriced />
			) : (
				<CostsPlot
					columns={cost}
					label="Cost per day by backend"
					max={costMax}
					order={order}
					ticks={[axisMoney(costMax), axisMoney(costMax / 2)]}
					tip={costTip}
				/>
			)}
			<DayScale days={days} />
		</div>
	);
};

export const CostsCharts = ({ days }: { readonly days: ReadonlyArray<DaySpend> }) => {
	const order = backendsOf(days);
	return (
		<section aria-label="By day" className="flex min-w-0 flex-col gap-2">
			<div className="flex min-w-0 flex-wrap items-baseline gap-2">
				<h3 className="text-sm">By day</h3>
				<span className="text-2xs text-muted-foreground">last 30 days</span>
				{order.length === 0 ? null : <Legend days={days} order={order} />}
			</div>
			{order.length === 0 ? (
				<p className="py-10 text-center text-2xs text-muted-foreground">No turns in the last 30 days</p>
			) : (
				<Plots days={days} order={order} />
			)}
		</section>
	);
};
