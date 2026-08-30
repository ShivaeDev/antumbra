export interface AdmissionSnapshot {
	readonly millisSinceLastChange: number;
	// why: gauges are domain-registered sensors the scheduler samples — the
	// snapshot grows fields while gates stay pure predicates.
	readonly readings: Readonly<Record<string, number>>;
	readonly runningCount: number;
}

// why: gates are pure predicates over a snapshot the scheduler assembles, so
// they are trivially testable and cannot start, stop, or observe intents. A
// time-based gate reports how long until it could open; the scheduler owns
// the actual timer.
export interface Gate {
	readonly admits: (snapshot: AdmissionSnapshot) => boolean;
	readonly id: string;
	readonly retryAfterMillis?: (snapshot: AdmissionSnapshot) => number;
}

export const maxConcurrency = (limit: number): Gate => ({
	admits: (snapshot) => snapshot.runningCount < limit,
	id: `max-concurrency(${limit})`,
});

export const settle = (quietMillis: number): Gate => ({
	admits: (snapshot) => snapshot.millisSinceLastChange >= quietMillis,
	id: `settle(${quietMillis})`,
	retryAfterMillis: (snapshot) => Math.max(1, quietMillis - snapshot.millisSinceLastChange),
});

export const gaugeCeiling = (reading: string, limit: number): Gate => ({
	admits: (snapshot) => (snapshot.readings[reading] ?? 0) < limit,
	id: `gauge-ceiling(${reading}, ${limit})`,
});
