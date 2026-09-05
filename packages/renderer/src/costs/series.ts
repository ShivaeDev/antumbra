import type { DaySpend, UsageTotal } from "@antumbra/contract";
import { costReported, tokensOf } from "#costs/format.ts";

export type Measure = "cost" | "tokens";

export interface Slice {
	readonly backend: string;
	readonly partial: boolean;
	readonly value: number;
}

export interface Column {
	readonly day: string;
	readonly slices: ReadonlyArray<Slice>;
}

export interface Bar extends Slice {
	readonly height: number;
	readonly y: number;
}

const measured = (total: UsageTotal, measure: Measure): number => (measure === "cost" ? (total.costUsd ?? 0) : tokensOf(total));

export const backendsOf = (days: ReadonlyArray<DaySpend>): ReadonlyArray<string> =>
	[...new Set(days.flatMap((day) => day.backends.map((spent) => spent.backend)))].toSorted((left, right) => left.localeCompare(right));

const sliceOf = (day: DaySpend, backend: string, measure: Measure): ReadonlyArray<Slice> => {
	const spent = day.backends.find((candidate) => candidate.backend === backend);
	if (spent === undefined) {
		return [];
	}
	const value = measured(spent.total, measure);
	return value === 0 ? [] : [{ backend, partial: spent.total.costPartial, value }];
};

export const columnsOf = (days: ReadonlyArray<DaySpend>, order: ReadonlyArray<string>, measure: Measure): ReadonlyArray<Column> =>
	days.map((day) => ({ day: day.day, slices: order.flatMap((backend) => sliceOf(day, backend, measure)) }));

export const peakOf = (columns: ReadonlyArray<Column>): number =>
	Math.max(0, ...columns.map((column) => column.slices.reduce((sum, slice) => sum + slice.value, 0)));

export const niceMax = (peak: number): number => {
	if (peak <= 0) {
		return 1;
	}
	const power = 10 ** Math.floor(Math.log10(peak));
	return (([1, 2, 5, 10] as const).find((step) => peak <= step * power) ?? 10) * power;
};

export const barsOf = (column: Column, max: number, height: number, gap: number): ReadonlyArray<Bar> => {
	const bars: Array<Bar> = [];
	let base = height;
	for (const slice of column.slices) {
		const span = (slice.value / max) * height;
		const inset = bars.length === 0 ? 0 : gap;
		bars.push({ ...slice, height: Math.max(span - inset, 0.5), y: base - span + inset });
		base -= span;
	}
	return bars;
};

export const unpricedIn = (days: ReadonlyArray<DaySpend>, backend: string): boolean => {
	const spent = days.flatMap((day) => day.backends.filter((candidate) => candidate.backend === backend));
	return spent.length > 0 && !spent.some((candidate) => costReported(candidate.total));
};

const OPACITY = [0.9, 0.5, 0.28, 0.14] as const;

export const seriesOpacity = (index: number): number => OPACITY[index] ?? 0.14;
