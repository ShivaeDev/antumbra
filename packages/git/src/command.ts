import { Effect, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { type GitError, type GitOperation, GitTimedOut, GitUnavailable } from "#errors.ts";
import { acceptProcessOutput } from "#result.ts";

interface GitCommand {
	readonly args: ReadonlyArray<string>;
	readonly operation: GitOperation;
	readonly timeoutMillis: number;
}

const collectRaw = Effect.fnUntraced(
	function* (command: GitCommand) {
		const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
		const process = yield* spawner.spawn(
			ChildProcess.make("git", command.args, {
				env: { GIT_TERMINAL_PROMPT: "0" },
				extendEnv: true,
				forceKillAfter: 5_000,
				stdin: "ignore",
			}),
		);
		return yield* Effect.all(
			{
				exitCode: process.exitCode,
				stderr: Stream.mkString(Stream.decodeText(process.stderr)),
				stdout: Stream.mkString(Stream.decodeText(process.stdout)),
			},
			{ concurrency: "unbounded" },
		);
	},
	Effect.scoped,
	(effect, command) =>
		effect.pipe(
			Effect.mapError(
				(cause) =>
					new GitUnavailable({
						detail: String(cause),
						operation: command.operation,
					}),
			),
		),
);

export const runGit = Effect.fn("Git.runGit")(
	(command: GitCommand): Effect.Effect<string, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
		collectRaw(command).pipe(
			Effect.timeoutOrElse({
				duration: command.timeoutMillis,
				orElse: () =>
					Effect.fail(
						new GitTimedOut({
							detail: `git ${command.operation} exceeded its deadline`,
							operation: command.operation,
							timeoutMillis: command.timeoutMillis,
						}),
					),
			}),
			Effect.flatMap((output) => acceptProcessOutput(command.operation, output)),
		),
);
