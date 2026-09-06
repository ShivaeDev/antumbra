import process from "node:process";
import { NodeRuntime } from "@effect/platform-node";
import { Cause, Clock, Console, Effect, Result } from "effect";
import { conditional } from "#pr/adapters/gh.ts";
import { checksPath, issueCommentsPath, parseCommand, pullPath, reviewCommentsPath, reviewsPath, type Target, type Until } from "#pr/command.ts";
import type { Outcome } from "#pr/observation.ts";
import { initial, render, step, type Watch } from "#pr/program.ts";

const interval = "30 seconds";

type Read = (path: string) => Effect.Effect<Outcome>;

const reader = (): Read => {
	const get = conditional();
	return (path) =>
		get(path).pipe(
			Effect.map((response): Outcome => (response.body === undefined ? { kind: "same" } : { kind: "body", body: response.body })),
			Effect.catch((error) => Effect.succeed<Outcome>({ kind: "failed", message: error.message })),
		);
};

const round = (target: Target, until: Until, read: Read, watch: Watch): Effect.Effect<void> =>
	Effect.gen(function* () {
		const head = watch.pieces.pull?.head;
		const now = yield* Clock.currentTimeMillis;
		const progress = step(watch, until, now, {
			checks: head === undefined ? undefined : { head, outcome: yield* read(checksPath(target, head)) },
			comments: yield* read(issueCommentsPath(target)),
			inline: yield* read(reviewCommentsPath(target)),
			pull: yield* read(pullPath(target)),
			reviews: yield* read(reviewsPath(target)),
		});
		yield* Effect.forEach(progress.lines, (line) => Console.log(render(line)));
		if (progress.exit !== undefined) {
			process.exitCode = progress.exit;
			return;
		}
		yield* Effect.sleep(interval);
		yield* round(target, until, read, progress.watch);
	});

const program = Effect.gen(function* () {
	const command = parseCommand(process.argv.slice(2));
	if (Result.isFailure(command)) {
		yield* Console.error(command.failure);
		process.exitCode = 2;
		return;
	}
	yield* round(command.success.target, command.success.until, reader(), initial);
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
