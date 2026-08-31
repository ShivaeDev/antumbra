import type { ChangeRow } from "@antumbra/changes";

export interface ObserveCadenceOptions {
	readonly coldMillis: number;
	readonly hotMillis: number;
	readonly hotWindowMillis: number;
	readonly warmMillis: number;
}

const hot = (row: ChangeRow, nowMillis: number, windowMillis: number): boolean =>
	row.stage === "open" && (row.checks === "pending" || nowMillis - row.activityAt.getTime() < windowMillis);

export const nextObserveDelayMillis = (watchable: ReadonlyArray<ChangeRow>, nowMillis: number, options: ObserveCadenceOptions): number => {
	if (watchable.some((row) => hot(row, nowMillis, options.hotWindowMillis))) {
		return options.hotMillis;
	}
	return watchable.some((row) => row.stage === "open" && row.draftAt === null) ? options.warmMillis : options.coldMillis;
};

export const retryObserveDelayMillis = (consecutiveFailures: number, options: ObserveCadenceOptions): number =>
	Math.min(options.warmMillis * 2 ** Math.max(consecutiveFailures - 1, 0), options.coldMillis);
