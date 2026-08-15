import { resolve } from "node:path";
import { type Options, query } from "@anthropic-ai/claude-agent-sdk";
import { InputQueue } from "#claude/adapters/input-queue.ts";

export interface RawSessionOptions {
	readonly cwd: string;
	readonly resume: boolean;
	readonly sessionId: string;
}

export interface RawWireEvent {
	readonly kind: string;
	readonly payload: string;
}

export interface RawEventListener {
	readonly end: () => void;
	readonly event: (event: RawWireEvent) => void;
}

export interface RawSession {
	readonly close: () => void;
	readonly interrupt: () => Promise<void>;
	readonly send: (text: string) => void;
	readonly subscribe: (listener: RawEventListener) => void;
}

export const openRawSession = (options: RawSessionOptions): RawSession => {
	const input = new InputQueue();
	// why: the SDK's literal "auto" permission mode — ruled policy, and not
	// interchangeable with bypassPermissions. cwd is resolved because it keys
	// the SDK's transcript space — a non-canonical path silently forks it.
	const sessionOptions: Options = {
		cwd: resolve(options.cwd),
		permissionMode: "auto",
		...(options.resume
			? { resume: options.sessionId }
			: { sessionId: options.sessionId }),
	};
	const live = query({ prompt: input.stream(), options: sessionOptions });

	// why: events reach consumers by push, never by awaiting the SDK iterator —
	// a consumer waiting on the SDK's own promise cannot be shut down while the
	// model is idle, which deadlocked session teardown. Ending is a signal;
	// close() fires it immediately regardless of what the subprocess is doing.
	const pendingEvents: RawWireEvent[] = [];
	let listener: RawEventListener | null = null;
	let ended = false;
	const deliver = (event: RawWireEvent): void => {
		if (listener === null) {
			pendingEvents.push(event);
			return;
		}
		listener.event(event);
	};
	const finish = (): void => {
		if (ended) {
			return;
		}
		ended = true;
		listener?.end();
	};
	void (async () => {
		try {
			for await (const message of live) {
				const subtype =
					"subtype" in message && typeof message.subtype === "string"
						? `/${message.subtype}`
						: "";
				deliver({
					kind: `${message.type}${subtype}`,
					payload: JSON.stringify(message),
				});
			}
		} catch {
			// why: an abrupt subprocess death is not an event — the end signal in
			// finally is; the gap in the log is the trace.
		} finally {
			finish();
		}
	})();

	return {
		close: () => {
			input.close();
			live.close();
			finish();
		},
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
		subscribe: (next) => {
			listener = next;
			for (const event of pendingEvents.splice(0)) {
				next.event(event);
			}
			if (ended) {
				next.end();
			}
		},
	};
};
