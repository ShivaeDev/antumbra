import { callWhileOpen } from "@antumbra/runner-ports/tool-call.ts";
import type { DirectTool, DirectToolOutcome } from "@antumbra/runner-ports/tools.ts";
import { Effect, Scope } from "effect";

export type ToolCall = (tool: DirectTool, callId: string, args: unknown) => Promise<DirectToolOutcome>;

export const sessionToolCall: Effect.Effect<ToolCall, never, Scope.Scope> = Effect.gen(function* () {
	const calls = yield* Effect.flatMap(Effect.scope, Scope.fork);
	const services = yield* Effect.context<never>();
	const run = Effect.runPromiseWith(services);
	return (tool, callId, args) => run(callWhileOpen(calls, tool, callId, args));
});
