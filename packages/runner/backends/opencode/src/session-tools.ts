import { callWhileOpen } from "@antumbra/runner-ports/tool-call.ts";
import type { DirectTool } from "@antumbra/runner-ports/tools.ts";
import { Effect, Scope } from "effect";
import type { ServedTool } from "#tool-sessions.ts";

export const servedTools = (tools: ReadonlyArray<DirectTool>): Effect.Effect<ReadonlyMap<string, ServedTool>, never, Scope.Scope> =>
	Effect.gen(function* () {
		const calls = yield* Effect.flatMap(Effect.scope, Scope.fork);
		const services = yield* Effect.context<never>();
		const run = Effect.runPromiseWith(services);
		return new Map(tools.map((tool) => [tool.name, (callId: string, args: unknown) => run(callWhileOpen(calls, tool, callId, args))]));
	});
