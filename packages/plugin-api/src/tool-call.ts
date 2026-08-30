import { Effect, Exit, Fiber, type Scope } from "effect";
import type { DirectTool, DirectToolOutcome } from "#tools.ts";

const closed: DirectToolOutcome = {
	ok: false,
	text: "the session that served this tool closed before the call finished",
};

export const callWhileOpen = (scope: Scope.Scope, tool: DirectTool, args: unknown): Effect.Effect<DirectToolOutcome> =>
	tool.call(args).pipe(
		Effect.forkIn(scope),
		Effect.flatMap(Fiber.await),
		Effect.flatMap((exit) => (Exit.hasInterrupts(exit) ? Effect.succeed(closed) : exit)),
	);
