export interface AdmissionSnapshot {
	readonly millisSinceLastChange: number;
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
	retryAfterMillis: (snapshot) =>
		Math.max(1, quietMillis - snapshot.millisSinceLastChange),
});

// why: RAM and CPU admission are part of the v1 gate surface without v1
// measurement backends — always-open stubs prove the interface holds them.
export const ramHeadroom = (): Gate => ({
	admits: () => true,
	id: "ram-headroom",
});

export const cpuHeadroom = (): Gate => ({
	admits: () => true,
	id: "cpu-headroom",
});
