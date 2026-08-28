import { Effect, Exit, Fiber, type Scope } from "effect";
import type { DirectTool, DirectToolOutcome } from "#tools.ts";

// why: interruption still answers. A tool that says nothing leaves the model
// waiting on a call it can neither retry nor reason about, so the one thing a
// closing session can still say is that it closed.
const closed: DirectToolOutcome = {
	ok: false,
	text: "the session that served this tool closed before the call finished",
};

// why: a call may wait for something the session cannot produce itself — a
// ruling, a person — so it runs as a fiber the opening scope owns rather than
// a root fiber of its own. Waiting then holds up no other call, and closing
// the scope ends the call instead of leaving work running for a session that
// is already gone. A call arriving after the scope closed is refused the same
// way, because the fiber it would need is interrupted the moment it starts.
export const callWhileOpen = (
	scope: Scope.Scope,
	tool: DirectTool,
	args: unknown,
): Effect.Effect<DirectToolOutcome> =>
	tool.call(args).pipe(
		Effect.forkIn(scope),
		Effect.flatMap(Fiber.await),
		Effect.flatMap((exit) =>
			Exit.hasInterrupts(exit) ? Effect.succeed(closed) : exit,
		),
	);
