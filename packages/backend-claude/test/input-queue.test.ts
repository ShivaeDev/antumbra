import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { expect, it } from "@effect/vitest";
import { Effect, Exit, Fiber } from "effect";
import { InputQueue } from "#adapters/input-queue.ts";

const message = (text: string): SDKUserMessage => ({
	message: { content: text, role: "user" },
	parent_tool_use_id: null,
	type: "user",
});

it.effect("a send settles only when the SDK iterator accepts its message", () =>
	Effect.gen(function* () {
		const input = new InputQueue();
		const receipt = yield* Effect.forkChild(
			input.push(message("sound the reef")),
		);
		yield* Effect.yieldNow;
		expect(receipt.pollUnsafe()).toBeUndefined();

		const iterator = input.stream()[Symbol.asyncIterator]();
		expect(yield* Effect.promise(() => iterator.next())).toEqual({
			done: false,
			value: message("sound the reef"),
		});
		yield* Fiber.join(receipt);
	}),
);

it.effect("closing fails a buffered send the SDK never accepted", () =>
	Effect.gen(function* () {
		const input = new InputQueue();
		const receipt = yield* Effect.forkChild(
			input.push(message("held in memory")),
		);
		yield* Effect.yieldNow;
		yield* Effect.sync(() => input.close());
		expect(Exit.isFailure(yield* Effect.exit(Fiber.join(receipt)))).toBe(true);
	}),
);
