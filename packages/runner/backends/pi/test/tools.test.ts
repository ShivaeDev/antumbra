import type { DirectTool } from "@antumbra/runner-ports/tools.ts";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Exit, Fiber, Scope } from "effect";
import { sessionToolCall } from "#adapters/tool-call.ts";
import { piToolAnswer, piTools } from "#adapters/tools.ts";

const SCHEMA = { properties: { entry: { type: "string" } }, required: ["entry"], type: "object" };

const tool: DirectTool = {
	call: () => Effect.succeed({ ok: true, text: "unused" }),
	description: "Post an entry on a board",
	inputSchema: SCHEMA,
	name: "post_board_entry",
};

const answering = (ok: boolean, text: string) => piToolAnswer(tool, () => Promise.resolve({ ok, text }));

it("hands pi the tool's own name, description, and input schema", () => {
	expect(piTools([tool], () => Promise.resolve({ ok: true, text: "" }))[0]).toMatchObject({
		description: "Post an entry on a board",
		name: "post_board_entry",
		parameters: SCHEMA,
	});
});

it.effect("returns what the tool said as text content", () =>
	Effect.map(
		Effect.promise(() => answering(true, "entry posted")("call-1", { entry: "hello" })),
		(result) => {
			expect(result.content).toEqual([{ text: "entry posted", type: "text" }]);
		},
	),
);

it.effect("throws a refusal so pi hands the model an error result", () =>
	Effect.map(Effect.exit(Effect.tryPromise(() => answering(false, "that board is closed")("call-1", { entry: "hello" }))), (outcome) => {
		expect(outcome._tag).toBe("Failure");
	}),
);

it.effect("passes the provider call identity through the session tool boundary", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const calls: unknown[] = [];
			const bound: DirectTool = {
				...tool,
				call: (callId, args) =>
					Effect.sync(() => {
						calls.push({ callId, args });
						return { ok: true, text: "recorded" };
					}),
			};
			const call = yield* sessionToolCall;
			yield* Effect.promise(() => piToolAnswer(bound, call)("provider-call-17", { entry: "hello" }));
			expect(calls).toEqual([{ callId: "provider-call-17", args: { entry: "hello" } }]);
		}),
	),
);

it.effect("settles a waiting provider callback when its session closes", () =>
	Effect.gen(function* () {
		const entered = yield* Deferred.make<void>();
		const scope = yield* Scope.make();
		const call = yield* sessionToolCall.pipe(Effect.provideService(Scope.Scope, scope));
		const waiting: DirectTool = { ...tool, call: () => Deferred.succeed(entered, undefined).pipe(Effect.andThen(Effect.never)) };
		const callback = yield* Effect.forkChild(Effect.tryPromise(() => piToolAnswer(waiting, call)("pending-call", {})).pipe(Effect.exit));
		yield* Deferred.await(entered);
		yield* Scope.close(scope, Exit.void);
		expect((yield* Fiber.join(callback))._tag).toBe("Failure");
	}),
);
