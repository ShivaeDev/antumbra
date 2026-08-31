// The contract reads request context synchronously; this browser shim does not carry it across awaits.
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
