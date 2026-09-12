import { Context, Effect, Layer, Schedule, ScopedRef } from "effect";
import { ChildProcess } from "effect/unstable/process";
import { ServerProcess } from "#adapters/server-process.ts";
import { ShellState } from "#adapters/shell-state.ts";

export class RunnerProcess extends Context.Service<RunnerProcess, object>()("@antumbra/desktop/RunnerProcess") {}

export const RunnerProcessLayer = (bundle: string, directory: string) =>
	Layer.effect(RunnerProcess)(
		Effect.gen(function* () {
			const { identity } = yield* ShellState;
			const { serving } = yield* ServerProcess;
			const { port, token } = yield* serving;
			const spawn = ChildProcess.make(
				process.execPath,
				[bundle, "--data", directory, "--server", `ws://127.0.0.1:${port}/runner`, "--runner-id", identity.runnerId, "--log-id", identity.logId],
				{
					env: { ANTUMBRA_TOKEN: token, ELECTRON_RUN_AS_NODE: "1" },
					extendEnv: true,
					forceKillAfter: "5 seconds",
					killSignal: "SIGTERM",
					stderr: "inherit",
					stdout: "inherit",
				},
			);
			const running = yield* ScopedRef.fromAcquire(spawn);
			yield* Effect.forkScoped(
				Effect.gen(function* () {
					const child = yield* ScopedRef.get(running);
					yield* child.exitCode;
					yield* Effect.logWarning("runner: the process ended; starting it again");
					yield* ScopedRef.set(running, spawn);
				}).pipe(
					Effect.catchCause((cause) => Effect.logError("runner: could not be started again", cause)),
					Effect.repeat({ schedule: Schedule.min([Schedule.exponential("500 millis"), Schedule.spaced("5 seconds")]) }),
				),
			);
			return {};
		}),
	).pipe(Layer.orDie);
