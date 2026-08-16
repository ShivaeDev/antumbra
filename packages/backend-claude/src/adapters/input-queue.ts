import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { BackendFailure } from "@antumbra/plugin-api";
import { Deferred, Effect } from "effect";

interface QueuedInput {
	readonly accepted: Deferred.Deferred<void, BackendFailure>;
	readonly message: SDKUserMessage;
}

const closedFailure = () =>
	new BackendFailure({
		detail: "session closed before delivery reached the provider",
		tag: "claude",
	});

// why: the SDK pulls user messages from an async iterable, making next() its
// acceptance boundary. A sender waits until that pull; close fails buffered
// senders and is the only graceful end of the otherwise-pending iterator.
export class InputQueue {
	private readonly buffer: QueuedInput[] = [];
	private pending: ((result: IteratorResult<SDKUserMessage>) => void) | null =
		null;
	private done = false;

	private accept(input: QueuedInput): void {
		Deferred.doneUnsafe(input.accepted, Effect.void);
	}

	private fail(input: QueuedInput): void {
		Deferred.doneUnsafe(input.accepted, Effect.fail(closedFailure()));
	}

	private offer(input: QueuedInput): void {
		if (this.done) {
			this.fail(input);
			return;
		}
		const pending = this.pending;
		if (pending !== null) {
			this.pending = null;
			pending({ done: false, value: input.message });
			this.accept(input);
			return;
		}
		this.buffer.push(input);
	}

	push(message: SDKUserMessage): Effect.Effect<void, BackendFailure> {
		const queue = this;
		return Effect.gen(function* () {
			const accepted = yield* Deferred.make<void, BackendFailure>();
			yield* Effect.sync(() => queue.offer({ accepted, message }));
			yield* Deferred.await(accepted);
		});
	}

	close(): void {
		this.done = true;
		for (const input of this.buffer.splice(0)) {
			this.fail(input);
		}
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
						this.accept(buffered);
						return Promise.resolve({
							done: false,
							value: buffered.message,
						});
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
