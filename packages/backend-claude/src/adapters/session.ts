import {
	query,
	type SDKMessage,
	type SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type { BackendFailure, DirectTool } from "@antumbra/plugin-api";
import { type Context, type Effect, Option } from "effect";
import { InputQueue } from "#adapters/input-queue.ts";
import { makeToolServer } from "#adapters/tool-server.ts";
import { sessionOptions, type ToolAccess } from "#session-options.ts";

interface RawSessionOptions {
	readonly cwd: string;
	// why: the Claude Code the host installed, never a bundled copy — the
	// desktop shell finds it, the backend never guesses a path.
	readonly executable: string;
	readonly resume: string | undefined;
	// why: the tools run their handlers on the services the session was opened
	// with, so a handler logs through the app's logger rather than a bare one.
	readonly services: Context.Context<never>;
	readonly tools: ReadonlyArray<DirectTool>;
}

interface RawEventListener {
	readonly end: () => void;
	readonly event: (message: SDKMessage) => void;
}

export interface RawSession {
	readonly close: () => void;
	readonly interrupt: () => Promise<void>;
	readonly queue: (text: string) => Effect.Effect<void, BackendFailure>;
	readonly steer: (text: string) => Effect.Effect<void, BackendFailure>;
	readonly subscribe: (listener: RawEventListener) => void;
}

export const consumeSdkMessages = async (
	live: AsyncIterable<SDKMessage>,
	input: InputQueue,
	deliver: (message: SDKMessage) => void,
): Promise<void> => {
	try {
		for await (const message of live) {
			deliver(message);
		}
	} catch {
		// why: an abrupt subprocess death is not an event — ending the output
		// stream is; the gap in the log remains the trace.
	} finally {
		input.close();
	}
};

const userMessage = (
	text: string,
	priority?: SDKUserMessage["priority"],
): SDKUserMessage => ({
	message: { content: text, role: "user" },
	parent_tool_use_id: null,
	...(priority === undefined ? {} : { priority }),
	type: "user",
});

// why: an empty tool set means the session acts through nothing, so no server
// is built and the SDK is never made to wait on one connecting.
const toolAccess = (options: RawSessionOptions): Option.Option<ToolAccess> =>
	options.tools.length === 0
		? Option.none()
		: Option.some({
				names: options.tools.map((tool) => tool.name),
				server: makeToolServer(options.tools, options.services),
			});

export const openRawSession = (options: RawSessionOptions): RawSession => {
	const input = new InputQueue();
	const live = query({
		options: sessionOptions({
			cwd: options.cwd,
			executable: options.executable,
			resume: options.resume,
			tools: toolAccess(options),
		}),
		prompt: input.stream(),
	});

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
	void consumeSdkMessages(live, input, deliver).finally(finish);

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
