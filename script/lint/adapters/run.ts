import { NodeFileSystem, NodeRuntime } from "@effect/platform-node";
import { Cause, Console, Effect, type FileSystem, Runtime } from "effect";

export const runMain = <Value, Error>(program: Effect.Effect<Value, Error, FileSystem.FileSystem>): void => {
	const reported = Effect.tapCause(program, (cause) =>
		Runtime.getErrorReported(Cause.squash(cause)) ? Console.error(Cause.pretty(cause)) : Effect.void,
	);
	NodeRuntime.runMain(Effect.provide(reported, NodeFileSystem.layer), {
		disableErrorReporting: true,
	});
};
