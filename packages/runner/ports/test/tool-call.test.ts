import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Exit, Fiber, Scope } from "effect";
import { callWhileOpen } from "#tool-call.ts";
import type { DirectTool } from "#tools.ts";

it.effect("closes a pending provider call when its session closes", () =>
	Effect.gen(function* () {
		const entered = yield* Deferred.make<void>();
		const scope = yield* Scope.make();
		const tool: DirectTool = {
			description: "Wait for a ruling",
			inputSchema: { type: "object" },
			name: "request_ruling",
			call: (callId) => {
				expect(callId).toBe("native-ruling");
				return Deferred.succeed(entered, undefined).pipe(Effect.andThen(Effect.never));
			},
		};
		const call = yield* Effect.forkChild(callWhileOpen(scope, tool, "native-ruling", {}));
		yield* Deferred.await(entered);
		yield* Scope.close(scope, Exit.void);
		expect(yield* Fiber.join(call)).toEqual({
			ok: false,
			text: "the session that served this tool closed before the call finished",
		});
	}),
);
