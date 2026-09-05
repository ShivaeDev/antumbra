import { type EffortLevel, query, type SDKMessage, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { BackendCapacityController, BackendFailure, DirectTool } from "@antumbra/plugin-api";
import { type Effect, Option } from "effect";
import { InputQueue } from "#adapters/input-queue.ts";
import { openSessionDeliveries, type RawEventListener } from "#adapters/session-delivery.ts";
import { mirroringSessionStore } from "#adapters/session-store.ts";
import { makeToolServer, type ToolCall } from "#adapters/tool-server.ts";
import { rawOf } from "#raw-payload.ts";
import { sessionOptions, type ToolAccess } from "#session-options.ts";

interface RawSessionOptions {
	readonly call: ToolCall;
	readonly cwd: string;
	readonly effort: EffortLevel | undefined;
	readonly executable: string;
	readonly model: string | undefined;
	readonly observeCapacity: BackendCapacityController["observe"];
	readonly resume: string | undefined;
	readonly skills: string;
	readonly tools: ReadonlyArray<DirectTool>;
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
	observeCapacity?: BackendCapacityController["observe"],
): Promise<void> => {
	try {
		for await (const message of live) {
			observeCapacity?.(rawOf(message));
			deliver(message);
		}
	} catch {
		// An abrupt SDK-process failure is represented only by stream completion; the journal keeps no invented provider event.
	} finally {
		input.close();
	}
};

const userMessage = (text: string, priority?: SDKUserMessage["priority"]): SDKUserMessage => ({
	message: { content: text, role: "user" },
	parent_tool_use_id: null,
	...(priority === undefined ? {} : { priority }),
	type: "user",
});

const toolAccess = (options: RawSessionOptions): Option.Option<ToolAccess> =>
	options.tools.length === 0
		? Option.none()
		: Option.some({
				names: options.tools.map((tool) => tool.name),
				server: makeToolServer(options.tools, options.call),
			});

export const openRawSession = (options: RawSessionOptions): RawSession => {
	const deliveries = openSessionDeliveries();
	const input = new InputQueue(deliveries.frame);
	const live = query({
		options: sessionOptions({
			cwd: options.cwd,
			effort: options.effort,
			executable: options.executable,
			model: options.model,
			resume: options.resume,
			skills: options.skills,
			store: mirroringSessionStore((write) => deliveries.deliver({ kind: "mirror", write })),
			tools: toolAccess(options),
		}),
		prompt: input.stream(),
	});
	void consumeSdkMessages(live, input, deliveries.frame, options.observeCapacity)
		.then(() => deliveries.repair(options.cwd))
		.finally(deliveries.finish);

	return {
		close: () => {
			deliveries.stop();
			input.close();
			live.close();
			deliveries.finish();
		},
		interrupt: async () => {
			await live.interrupt();
		},
		queue: (text) => input.push(userMessage(text)),
		// Claude priority `now` injects mid-turn; an unprioritized message waits for the next turn boundary.
		steer: (text) => input.push(userMessage(text, "now")),
		subscribe: deliveries.subscribe,
	};
};
