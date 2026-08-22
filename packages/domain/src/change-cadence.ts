import type { ChangeRow } from "@antumbra/changes";

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
	row.stage === "open" &&
	(row.checks === "pending" ||
		nowMillis - row.activityAt.getTime() < windowMillis);

// why: how often to ask is a tuning question the cone hides, so it is answered
// by one pure function with three speeds and a window — a seam use can set,
// rather than a number this file guesses and nobody can move.
//
// why: a draft is something an agent is still writing, not something waiting
// on a host, so a fleet of nothing but drafts costs the slowest cadence.
export const nextObserveDelayMillis = (
	watchable: ReadonlyArray<ChangeRow>,
	nowMillis: number,
	options: ObserveCadenceOptions,
): number => {
	if (watchable.some((row) => hot(row, nowMillis, options.hotWindowMillis))) {
		return options.hotMillis;
	}
	return watchable.some((row) => row.stage === "open" && row.draftAt === null)
		? options.warmMillis
		: options.coldMillis;
};

// why: a pass that failed says nothing about the fleet, so its own run of
// failures decides when to ask again — the warm cadence for the first, half
// as often for each one after it, and never rarer than a fleet with nothing
// to say. A host having a bad hour costs a handful of calls rather than one
// every warm period, and one that comes back is noticed within a cold one.
export const retryObserveDelayMillis = (
	consecutiveFailures: number,
	options: ObserveCadenceOptions,
): number =>
	Math.min(
		options.warmMillis * 2 ** Math.max(consecutiveFailures - 1, 0),
		options.coldMillis,
	);
