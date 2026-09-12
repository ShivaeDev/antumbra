import { GhUnavailable } from "@antumbra/edge-github/errors.ts";
import { type GhCommand, GhProcess } from "@antumbra/edge-github/process.ts";
import { Effect, Layer, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

const collectRaw = (command: GhCommand) =>
	Effect.scoped(
		Effect.gen(function* () {
			const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
			const process = yield* spawner.spawn(
				ChildProcess.make(command.executable, command.args, {
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

export const ghProcessLayer = Layer.effect(
	GhProcess,
	Effect.gen(function* () {
		const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
		return { run: (command: GhCommand) => collectRaw(command).pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner)) };
	}),
);
