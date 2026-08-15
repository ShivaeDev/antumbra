import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";

// why: the SDK pulls user messages from an async iterable whose return ENDS
// the session, so the queue's iterator stays pending until close() — close
// is the only graceful shutdown.
export class InputQueue {
	private readonly buffer: SDKUserMessage[] = [];
	private pending: ((result: IteratorResult<SDKUserMessage>) => void) | null =
		null;
	private done = false;

	push(message: SDKUserMessage): void {
		const pending = this.pending;
		if (pending !== null) {
			this.pending = null;
			pending({ done: false, value: message });
			return;
		}
		this.buffer.push(message);
	}

	close(): void {
		this.done = true;
		const pending = this.pending;
		if (pending !== null) {
			this.pending = null;
			pending({ done: true, value: undefined });
		}
	}

	stream(): AsyncIterable<SDKUserMessage> {
		return {
			[Symbol.asyncIterator]: () => ({
				next: () => {
					const buffered = this.buffer.shift();
					if (buffered !== undefined) {
						return Promise.resolve({ done: false, value: buffered });
					}
					if (this.done) {
						return Promise.resolve({
							done: true as const,
							value: undefined,
						});
					}
					return new Promise((promiseResolve) => {
						this.pending = promiseResolve;
					});
				},
			}),
		};
	}
}
