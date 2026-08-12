import process from "node:process";
import { NodeFileSystem } from "@effect/platform-node";
import { Cause, Effect, Exit, type FileSystem } from "effect";

export const runMain = <Value, Error>(
	program: Effect.Effect<Value, Error, FileSystem.FileSystem>,
): void => {
	Effect.runPromiseExit(Effect.provide(program, NodeFileSystem.layer)).then(
		(exit) => {
			if (Exit.isFailure(exit)) {
				process.stderr.write(`${Cause.pretty(exit.cause)}\n`);
				process.exitCode = 1;
			}
		},
	);
};
