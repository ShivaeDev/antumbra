import { resolve } from "node:path";
import {
	type Options,
	query,
	type SDKMessage,
	type SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { InputQueue } from "#adapters/input-queue.ts";

export interface RawSessionOptions {
	readonly cwd: string;
	readonly resume: string | undefined;
}

export interface RawEventListener {
	readonly end: () => void;
	readonly event: (message: SDKMessage) => void;
}

export interface RawSession {
	readonly close: () => void;
	readonly interrupt: () => Promise<void>;
	readonly queue: (text: string) => void;
	readonly steer: (text: string) => void;
	readonly subscribe: (listener: RawEventListener) => void;
}

const userMessage = (
	text: string,
	priority?: SDKUserMessage["priority"],
): SDKUserMessage => ({
	message: { content: text, role: "user" },
	parent_tool_use_id: null,
	...(priority === undefined ? {} : { priority }),
	type: "user",
});

export const openRawSession = (options: RawSessionOptions): RawSession => {
	const input = new InputQueue();
	// why: the SDK's literal "auto" permission mode — ruled policy, and not
	// interchangeable with bypassPermissions. cwd is resolved because it keys
	// the SDK's transcript space — a non-canonical path silently forks it. No
	// session id is pre-assigned: the SDK mints one and reports it in
	// system/init, the same path codex threads take.
	const sessionOptions: Options = {
		cwd: resolve(options.cwd),
		permissionMode: "auto",
		...(options.resume === undefined ? {} : { resume: options.resume }),
	};
	const live = query({ prompt: input.stream(), options: sessionOptions });

	// why: events reach consumers by push, never by awaiting the SDK iterator —
	// a consumer waiting on the SDK's own promise cannot be shut down while the
	// model is idle, which deadlocked session teardown. Ending is a signal;
	// close() fires it immediately regardless of what the subprocess is doing.
	const pendingEvents: SDKMessage[] = [];
	let listener: RawEventListener | null = null;
	let ended = false;
	const deliver = (message: SDKMessage): void => {
		if (listener === null) {
			pendingEvents.push(message);
			return;
		}
		listener.event(message);
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
				deliver(message);
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
		queue: (text) => input.push(userMessage(text)),
		// why: "now" is the SDK's mid-turn injection lane — the steer verb of
		// ruling-level precedence; queue is the turn-boundary default.
		steer: (text) => input.push(userMessage(text, "now")),
		subscribe: (next) => {
			listener = next;
			for (const message of pendingEvents.splice(0)) {
				next.event(message);
			}
			if (ended) {
				next.end();
			}
		},
	};
};
