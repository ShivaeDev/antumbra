import process from "node:process";
import { features } from "@antumbra/server/features.ts";
import { NodeRuntime } from "@effect/platform-node";
import { Cause, Config, Console, Effect, Result } from "effect";
import { appDataDirectory } from "#journal/adapters/files.ts";
import { parseCommand } from "#journal/command.ts";
import { devDataDirectory, overrideVariable } from "#journal/paths.ts";
import { run } from "#journal/program.ts";

const fail = (message: string) =>
	Console.error(message).pipe(
		Effect.tap(() =>
			Effect.sync(() => {
				process.exitCode = 1;
			}),
		),
	);

const program = Effect.gen(function* () {
	const command = parseCommand(process.argv.slice(2));
	if (Result.isFailure(command)) return yield* fail(command.failure);
	const override = yield* Config.string(overrideVariable).pipe(Config.withDefault(""));
	const directory = devDataDirectory(appDataDirectory(), override);
	if (Result.isFailure(directory)) return yield* fail(directory.failure);
	const outcome = yield* run(command.success, directory.success, features);
	if (outcome.refused) return yield* fail(outcome.lines.join("\n"));
	yield* Effect.forEach(outcome.lines, (line) => Console.log(line));
}).pipe(Effect.catchCause((cause) => fail(Cause.pretty(cause))));

NodeRuntime.runMain(program, { disableErrorReporting: true });
