import process from "node:process";
import { NodeRuntime } from "@effect/platform-node";
import { Cause, Console, Effect, Result } from "effect";
import { viewPullRequest } from "#pr/adapters/gh.ts";
import { initial, parseCommand, render, step, type Until, type Watch } from "#pr/program.ts";

const interval = "30 seconds";

const round = (spec: string, until: Until, watch: Watch): Effect.Effect<void> =>
	Effect.gen(function* () {
		const outcome = yield* viewPullRequest(spec).pipe(
			Effect.mapError((error) => error.message),
			Effect.result,
		);
		const progress = step(watch, until, outcome);
		yield* Effect.forEach(progress.lines, (line) => Console.log(render(line)));
		if (progress.exit !== undefined) {
			process.exitCode = progress.exit;
			return;
		}
		yield* Effect.sleep(interval);
		yield* round(spec, until, progress.watch);
	});

const program = Effect.gen(function* () {
	const command = parseCommand(process.argv.slice(2));
	if (Result.isFailure(command)) {
		yield* Console.error(command.failure);
		process.exitCode = 2;
		return;
	}
	yield* round(command.success.spec, command.success.until, initial);
}).pipe(
	Effect.catchCause((cause) =>
		Console.error(Cause.pretty(cause)).pipe(
			Effect.tap(() =>
				Effect.sync(() => {
					process.exitCode = 2;
				}),
			),
		),
	),
);

NodeRuntime.runMain(program, { disableErrorReporting: true });
