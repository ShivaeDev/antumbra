// why: the server begins talking the moment its stream is open, which is
// before anything above it has had a chance to subscribe. A frame that arrived
// early is held rather than dropped, so a session cannot miss the news of its
// own opening because the wiring finished a tick late.
export interface Relay<Value> {
	readonly listen: (listener: (value: Value) => void) => void;
	readonly send: (value: Value) => void;
}

export const openRelay = <Value>(): Relay<Value> => {
	let listener: ((value: Value) => void) | null = null;
	const held: Value[] = [];
	return {
		listen: (next) => {
			listener = next;
			for (const value of held.splice(0)) {
				next(value);
			}
		},
		send: (value) => {
			if (listener === null) {
				held.push(value);
				return;
			}
			listener(value);
		},
	};
};
