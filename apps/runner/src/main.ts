import type { AgentBackend } from "@antumbra/runner-ports/backend.ts";
import { NodeRuntime } from "@effect/platform-node";
import { Cause, Effect, Layer, Logger } from "effect";
import { application } from "#application.ts";
import { options } from "#options.ts";

export const main = (backends: ReadonlyMap<string, AgentBackend>) => {
	const run = Effect.flatMap(options(process.argv), (configured) => application(configured, backends)).pipe(Effect.scoped);
	const reported = run.pipe(Effect.tapCause((cause) => (Cause.hasInterruptsOnly(cause) ? Effect.void : Effect.logError(cause))));
	NodeRuntime.runMain(reported.pipe(Effect.provide(Layer.succeed(Logger.LogToStderr, true))), { disableErrorReporting: true });
};
