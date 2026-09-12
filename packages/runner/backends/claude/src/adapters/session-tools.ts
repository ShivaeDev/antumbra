import { callWhileOpen } from "@antumbra/runner-ports/tool-call.ts";
import { Effect, Scope } from "effect";
import type { ToolCall } from "#runtime.ts";

export const sessionToolCall: Effect.Effect<ToolCall, never, Scope.Scope> = Effect.gen(function* () {
	const calls = yield* Effect.flatMap(Effect.scope, Scope.fork);
	const services = yield* Effect.context<never>();
	const run = Effect.runPromiseWith(services);
	return (tool, callId, args) => run(callWhileOpen(calls, tool, callId, args));
});
