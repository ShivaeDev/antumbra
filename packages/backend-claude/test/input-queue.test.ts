import type { SDKMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Exit, Fiber } from "effect";
import { InputQueue } from "#adapters/input-queue.ts";
import { consumeSdkMessages } from "#adapters/session.ts";

const message = (text: string): SDKUserMessage => ({
	message: { content: text, role: "user" },
	parent_tool_use_id: null,
	type: "user",
});

const toolResult: SDKUserMessage = {
	message: {
		content: [{ content: "sounded", tool_use_id: "tool-1", type: "tool_result" }],
		role: "user",
	},
	parent_tool_use_id: null,
	type: "user",
};

it.effect("a send settles only when the SDK iterator accepts its message", () =>
	Effect.gen(function* () {
		const handed: SDKUserMessage[] = [];
		const input = new InputQueue((taken) => handed.push(taken));
		const pull = yield* Deferred.make<void>();
		const iterator = input.stream()[Symbol.asyncIterator]();
		const accepted = yield* Effect.forkChild(Deferred.await(pull).pipe(Effect.andThen(Effect.promise(() => iterator.next()))));
		let settled = false;
		const receipt = Effect.runPromise(input.push(message("sound the reef")).pipe(Effect.tap(() => Effect.sync(() => (settled = true)))));
		expect(settled).toBe(false);
		expect(handed).toEqual([]);

		yield* Deferred.succeed(pull, undefined);
		expect(yield* Fiber.join(accepted)).toEqual({
			done: false,
			value: message("sound the reef"),
		});
		yield* Effect.promise(() => receipt);
		expect(handed).toEqual([message("sound the reef")]);
	}),
);

it.effect("a buffered send is handed over after earlier SDK events", () =>
	Effect.gen(function* () {
		const delivered: SDKMessage[] = [];
		const deliver = (taken: SDKMessage): void => {
			delivered.push(taken);
		};
		const input = new InputQueue(deliver);
		const pull = yield* Deferred.make<void>();
		const iterator = input.stream()[Symbol.asyncIterator]();
		const accepted = yield* Effect.forkChild(Deferred.await(pull).pipe(Effect.andThen(Effect.promise(() => iterator.next()))));
		const receipt = Effect.runPromise(input.push(message("steer for the reef")));
		yield* Effect.sync(() => deliver(toolResult));
		expect(delivered).toEqual([toolResult]);

		yield* Deferred.succeed(pull, undefined);
		yield* Fiber.join(accepted);
		yield* Effect.promise(() => receipt);
		expect(delivered).toEqual([toolResult, message("steer for the reef")]);
	}),
);

it.effect("closing fails a buffered send the SDK never accepted", () =>
	Effect.gen(function* () {
		const handed: SDKUserMessage[] = [];
		const input = new InputQueue((taken) => handed.push(taken));
		const receipt = Effect.runPromiseExit(input.push(message("held in memory")));
		yield* Effect.sync(() => input.close());
		expect(Exit.isFailure(yield* Effect.promise(() => receipt))).toBe(true);
		expect(handed).toEqual([]);
	}),
);

it.effect("provider termination fails a buffered send", () =>
	Effect.gen(function* () {
		const handed: SDKUserMessage[] = [];
		const input = new InputQueue((taken) => handed.push(taken));
		const terminate = yield* Deferred.make<void>();
		const requested = yield* Deferred.make<void>();
		const ended: AsyncIterable<SDKMessage> = {
			[Symbol.asyncIterator]: () => ({
				next: () =>
					Effect.runPromise(
						Deferred.succeed(requested, undefined).pipe(
							Effect.andThen(Deferred.await(terminate)),
							Effect.as({ done: true as const, value: undefined }),
						),
					),
			}),
		};
		const consumption = consumeSdkMessages(ended, input, () => {});
		yield* Deferred.await(requested);
		const receipt = Effect.runPromiseExit(input.push(message("held when provider died")));
		yield* Deferred.succeed(terminate, undefined);
		yield* Effect.promise(() => consumption);
		expect(Exit.isFailure(yield* Effect.promise(() => receipt))).toBe(true);
		expect(handed).toEqual([]);
	}),
);
