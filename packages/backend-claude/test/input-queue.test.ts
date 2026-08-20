import type {
	SDKMessage,
	SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { expect, it } from "@effect/vitest";
import { Effect, Exit, Fiber } from "effect";
import { InputQueue } from "#adapters/input-queue.ts";
import { consumeSdkMessages } from "#adapters/session.ts";
import { openSessionMapping } from "#mapping.ts";

const message = (text: string): SDKUserMessage => ({
	message: { content: text, role: "user" },
	parent_tool_use_id: null,
	type: "user",
});

const toolResult: SDKUserMessage = {
	message: {
		content: [
			{ content: "sounded", tool_use_id: "tool-1", type: "tool_result" },
		],
		role: "user",
	},
	parent_tool_use_id: null,
	type: "user",
};

it.effect("a send settles only when the SDK iterator accepts its message", () =>
	Effect.gen(function* () {
		const handed: SDKUserMessage[] = [];
		const input = new InputQueue((taken) => handed.push(taken));
		const receipt = yield* Effect.forkChild(
			input.push(message("sound the reef")),
		);
		yield* Effect.yieldNow;
		expect(receipt.pollUnsafe()).toBeUndefined();
		expect(handed).toEqual([]);

		const iterator = input.stream()[Symbol.asyncIterator]();
		expect(yield* Effect.promise(() => iterator.next())).toEqual({
			done: false,
			value: message("sound the reef"),
		});
		yield* Fiber.join(receipt);
		expect(handed).toEqual([message("sound the reef")]);
	}),
);

it.effect("words land behind the step they were handed over during", () =>
	Effect.gen(function* () {
		const delivered: SDKMessage[] = [];
		const deliver = (taken: SDKMessage): void => {
			delivered.push(taken);
		};
		const input = new InputQueue(deliver);
		const receipt = yield* Effect.forkChild(
			input.push(message("steer for the reef")),
		);
		yield* Effect.yieldNow;
		// why: the provider is mid-step when the words arrive, and the step's own
		// events keep flowing — a transcript that placed the words first would
		// claim they were read before the work they answer.
		yield* Effect.sync(() => deliver(toolResult));
		expect(delivered).toEqual([toolResult]);

		const iterator = input.stream()[Symbol.asyncIterator]();
		yield* Effect.promise(() => iterator.next());
		yield* Fiber.join(receipt);
		expect(delivered).toEqual([toolResult, message("steer for the reef")]);
		const mapping = openSessionMapping();
		expect(delivered.flatMap((taken) => mapping.frame(taken))).toMatchObject([
			{ ok: true, output: "sounded", toolId: "tool-1", type: "tool.completed" },
			{ role: "user", text: "steer for the reef", type: "message" },
		]);
	}),
);

it.effect("closing fails a buffered send the SDK never accepted", () =>
	Effect.gen(function* () {
		const handed: SDKUserMessage[] = [];
		const input = new InputQueue((taken) => handed.push(taken));
		const receipt = yield* Effect.forkChild(
			input.push(message("held in memory")),
		);
		yield* Effect.yieldNow;
		yield* Effect.sync(() => input.close());
		expect(Exit.isFailure(yield* Effect.exit(Fiber.join(receipt)))).toBe(true);
		// why: words nobody was ever handed are words nobody was ever told.
		expect(handed).toEqual([]);
	}),
);

it.effect("provider termination fails a buffered send", () =>
	Effect.gen(function* () {
		const handed: SDKUserMessage[] = [];
		const input = new InputQueue((taken) => handed.push(taken));
		const receipt = yield* Effect.forkChild(
			input.push(message("held when provider died")),
		);
		yield* Effect.yieldNow;
		const ended: AsyncIterable<SDKMessage> = {
			[Symbol.asyncIterator]: () => ({
				next: () => Promise.resolve({ done: true, value: undefined }),
			}),
		};
		yield* Effect.promise(() => consumeSdkMessages(ended, input, () => {}));
		yield* Effect.yieldNow;
		const result = receipt.pollUnsafe();
		expect(result !== undefined && Exit.isFailure(result)).toBe(true);
		expect(handed).toEqual([]);
	}),
);
