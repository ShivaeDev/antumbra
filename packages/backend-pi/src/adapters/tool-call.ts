import { callWhileOpen, type DirectTool, type DirectToolOutcome } from "@antumbra/plugin-api";
import { Effect, Scope } from "effect";

export type ToolCall = (tool: DirectTool, args: unknown) => Promise<DirectToolOutcome>;

export const sessionToolCall: Effect.Effect<ToolCall, never, Scope.Scope> = Effect.gen(function* () {
	const calls = yield* Effect.flatMap(Effect.scope, Scope.fork);
	const services = yield* Effect.context<never>();
	const run = Effect.runPromiseWith(services);
	return (tool, args) => run(callWhileOpen(calls, tool, args));
});
