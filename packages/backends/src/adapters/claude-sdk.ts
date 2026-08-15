import { resolve } from "node:path";
import {
	type Options,
	query,
	type SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";

export interface RawSessionOptions {
	readonly cwd: string;
	readonly resume: boolean;
	readonly sessionId: string;
}

export interface RawWireEvent {
	readonly kind: string;
	readonly payload: string;
}

export interface RawSession {
	readonly close: () => void;
	readonly events: AsyncIterable<RawWireEvent>;
	readonly interrupt: () => Promise<void>;
	readonly send: (text: string) => void;
}

// why: the SDK pulls user messages from an async iterable whose return ENDS
// the session (P2), so the queue's iterator stays pending until close() —
// close is the only graceful shutdown.
class InputQueue {
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

async function* mapEvents(
	messages: AsyncIterable<{ type: string }>,
): AsyncIterable<RawWireEvent> {
	for await (const message of messages) {
		const subtype =
			"subtype" in message && typeof message.subtype === "string"
				? `/${message.subtype}`
				: "";
		yield { kind: `${message.type}${subtype}`, payload: JSON.stringify(message) };
	}
}

export const openRawSession = (options: RawSessionOptions): RawSession => {
	const input = new InputQueue();
	// why: auto mode is the ruling — full permissions, stock host config,
	// nothing stripped. cwd is resolved because it keys the SDK's transcript
	// space (P2: a non-canonical path silently forks the key space).
	const sessionOptions: Options = {
		cwd: resolve(options.cwd),
		permissionMode: "bypassPermissions",
		...(options.resume
			? { resume: options.sessionId }
			: { sessionId: options.sessionId }),
	};
	const live = query({ prompt: input.stream(), options: sessionOptions });
	return {
		close: () => {
			input.close();
			live.close();
		},
		events: mapEvents(live),
		interrupt: async () => {
			await live.interrupt();
		},
		send: (text) => {
			input.push({
				message: { content: text, role: "user" },
				parent_tool_use_id: null,
				type: "user",
			});
		},
	};
};
