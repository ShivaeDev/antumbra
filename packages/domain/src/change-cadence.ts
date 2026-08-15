import type { ChangeRow } from "#change-rows.ts";

export interface ObserveCadenceOptions {
	readonly coldMillis: number;
	readonly hotMillis: number;
	readonly hotWindowMillis: number;
	readonly warmMillis: number;
}

// why: a change is hot while its answer is about to change — checks still
// running, or somebody touched it a moment ago. Anything else that is open is
// warm: nobody is moving it, but it can land at any time.
const hot = (
	row: ChangeRow,
	nowMillis: number,
	windowMillis: number,
): boolean =>
	row.checks === "pending" ||
	nowMillis - row.activityAt.getTime() < windowMillis;

// why: how often to ask is a tuning question the cone hides, so it is answered
// by one pure function with three speeds and a window — a seam use can set,
// rather than a number this file guesses and nobody can move.
//
// why: a draft is something an agent is still writing, not something waiting
// on a host, so a fleet of nothing but drafts costs the slowest cadence.
export const nextObserveDelayMillis = (
	open: ReadonlyArray<ChangeRow>,
	nowMillis: number,
	options: ObserveCadenceOptions,
): number => {
	if (open.some((row) => hot(row, nowMillis, options.hotWindowMillis))) {
		return options.hotMillis;
	}
	return open.some((row) => row.draftAt === null)
		? options.warmMillis
		: options.coldMillis;
};
