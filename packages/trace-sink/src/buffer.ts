export interface BoundedBuffer<A> {
	readonly drain: () => readonly A[];
	readonly push: (value: A) => boolean;
}

// why: the hot path is a bounded array push and nothing else — no encoding, no
// database, no fiber. Refusing a value past the cap is what keeps a runaway
// producer from trading the app's memory for a trace nobody asked for; the sink
// reads that refusal as a reason to stand down rather than to grow.
export const makeBoundedBuffer = <A>(capacity: number): BoundedBuffer<A> => {
	let pending: A[] = [];
	return {
		drain: () => {
			const drained = pending;
			pending = [];
			return drained;
		},
		push: (value) => {
			if (pending.length >= capacity) {
				return false;
			}
			pending.push(value);
			return true;
		},
	};
};
