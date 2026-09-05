import type { PieceCounts } from "#voyage-view.ts";

export interface VoyagePace {
	readonly limit: number;
	readonly running: number;
	readonly unlaunched: number;
	readonly waiting: number;
}

export const plural = (count: number): string => (count === 1 ? "" : "s");

export const paceOf = (counts: PieceCounts, limit: number): VoyagePace => ({
	limit,
	running: counts.active,
	unlaunched: counts.held,
	waiting: counts.ready,
});

export const paceWords = (pace: VoyagePace): string =>
	`this voyage has ${pace.running} piece${plural(pace.running)} running and ${pace.waiting} waiting for capacity; the fleet runs at most ${pace.limit} agent${plural(pace.limit)} at once`;
