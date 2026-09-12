import type { AgentBackend } from "@antumbra/runner-ports/backend.ts";
import { NodeRuntime } from "@effect/platform-node";
import { Cause, Effect, Layer, Logger, type Scope } from "effect";
import { application } from "#application.ts";
import { type Options, options } from "#options.ts";

export const main = (assemble: (options: Options) => Effect.Effect<ReadonlyMap<string, AgentBackend>, never, Scope.Scope>) => {
	const run = Effect.gen(function* () {
		const configured = yield* options(process.argv);
		const backends = yield* assemble(configured);
		yield* application(configured, backends);
	}).pipe(Effect.scoped);
	const reported = run.pipe(Effect.tapCause((cause) => (Cause.hasInterruptsOnly(cause) ? Effect.void : Effect.logError(cause))));
	NodeRuntime.runMain(reported.pipe(Effect.provide(Layer.succeed(Logger.LogToStderr, true))), { disableErrorReporting: true });
};
