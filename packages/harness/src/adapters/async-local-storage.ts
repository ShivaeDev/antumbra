// why: a browser has no async_hooks, and the one consumer that reaches for it
// reads the store back inside the same synchronous call that set it. A stack
// is a faithful stand-in for exactly that, and never pretends to follow a
// continuation across an await the way the real thing does.
export class AsyncLocalStorage<Store> {
	private readonly frames: Store[] = [];

	getStore(): Store | undefined {
		return this.frames.at(-1);
	}

	run<Value>(store: Store, evaluate: () => Value): Value {
		this.frames.push(store);
		try {
			return evaluate();
		} finally {
			this.frames.pop();
		}
	}
}
