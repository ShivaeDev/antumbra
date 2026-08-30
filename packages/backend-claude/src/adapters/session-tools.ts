import { callWhileOpen } from "@antumbra/plugin-api";
import { Effect, Scope } from "effect";
import type { ToolCall } from "#adapters/tool-server.ts";

// why: the calls get a child scope taken before the subprocess is acquired, so
// they are interrupted only once it is already closed — a call still waiting
// when the session ended is refused after the SDK has torn its transport down,
// and the refusal is dropped instead of being written into it. The session's
// services travel with the calls, so a handler logs and reads time like
// everything else in the process.
export const sessionToolCall: Effect.Effect<ToolCall, never, Scope.Scope> = Effect.gen(function* () {
	const calls = yield* Effect.flatMap(Effect.scope, Scope.fork);
	const services = yield* Effect.context<never>();
	const run = Effect.runPromiseWith(services);
	return (tool, args) => run(callWhileOpen(calls, tool, args));
});
