import { Effect, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { type GhError, type GhOperation, GhUnavailable } from "#errors.ts";
import { acceptProcessOutput, decodeProcessOutput } from "#result.ts";

interface GhCommand {
	readonly args: ReadonlyArray<string>;
	readonly cwd?: string | undefined;
	readonly executable: string;
	readonly operation: GhOperation;
	readonly timeoutMillis: number;
}

const collectRaw = (command: GhCommand) =>
	Effect.scoped(
		Effect.gen(function* () {
			const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
			const process = yield* spawner.spawn(
				ChildProcess.make(command.executable, command.args, {
					cwd: command.cwd,
					// gh must never wait for interactive input.
					env: {
						GH_NO_UPDATE_NOTIFIER: "1",
						GH_PROMPT_DISABLED: "1",
						NO_COLOR: "1",
					},
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
		}),
	).pipe(
		Effect.mapError(
			(cause) =>
				new GhUnavailable({
					detail: String(cause),
					operation: command.operation,
				}),
		),
	);

export const runGh = (command: GhCommand): Effect.Effect<string, GhError, ChildProcessSpawner.ChildProcessSpawner> =>
	collectRaw(command).pipe(
		Effect.flatMap((output) => decodeProcessOutput(command.operation, output)),
		Effect.timeoutOrElse({
			duration: command.timeoutMillis,
			orElse: () =>
				Effect.fail(
					new GhUnavailable({
						detail: `gh ${command.operation} exceeded its deadline of ${command.timeoutMillis}ms`,
						operation: command.operation,
					}),
				),
		}),
		Effect.flatMap((output) => acceptProcessOutput(command.operation, output)),
	);
