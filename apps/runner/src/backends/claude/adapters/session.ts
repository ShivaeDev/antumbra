import { type EffortLevel, query, type SDKMessage, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { InputQueue } from "@antumbra/runner-backends-claude/adapters/input-queue.ts";
import { rawOf } from "@antumbra/runner-backends-claude/raw-payload.ts";
import type { RawSession, ToolCall } from "@antumbra/runner-backends-claude/runtime.ts";
import type { BackendCapacityController } from "@antumbra/runner-ports/backend-capacity.ts";
import type { DirectTool } from "@antumbra/runner-ports/tools.ts";
import { Option } from "effect";
import { openSessionDeliveries } from "#backends/claude/adapters/session-delivery.ts";
import { sessionOptions, type ToolAccess } from "#backends/claude/adapters/session-options.ts";
import { mirroringSessionStore } from "#backends/claude/adapters/session-store.ts";
import { makeToolServer } from "#backends/claude/adapters/tool-server.ts";

interface RawSessionOptions {
	readonly call: ToolCall;
	readonly constrainedPrompt: string | undefined;
	readonly cwd: string;
	readonly effort: EffortLevel | undefined;
	readonly executable: string;
	readonly model: string;
	readonly observeCapacity: BackendCapacityController["observe"];
	readonly resume: string | undefined;
	readonly skills: string;
	readonly tools: ReadonlyArray<DirectTool>;
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

export const openRawSession = (options: RawSessionOptions): RawSession & { readonly close: () => void } => {
	const deliveries = openSessionDeliveries();
	const input = new InputQueue(deliveries.frame);
	const live = query({
		options: sessionOptions({
			constrainedPrompt: options.constrainedPrompt,
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
		.catch(deliveries.fail)
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
