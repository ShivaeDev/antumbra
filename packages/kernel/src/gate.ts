export interface AdmissionSnapshot {
	readonly millisSinceLastChange: number;
	readonly readings: Readonly<Record<string, number>>;
	readonly runningCount: number;
}

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
