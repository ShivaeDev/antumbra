import type { Serving } from "@antumbra/platform-shell/bridge.ts";
import { Context, Effect, Layer, Option, type PlatformError, Schedule, Schema, ScopedRef, Stream } from "effect";
import { ChildProcess, type ChildProcessSpawner } from "effect/unstable/process";
import { ShellState } from "#adapters/shell-state.ts";

export type { Serving } from "@antumbra/platform-shell/bridge.ts";

export class ServerProcess extends Context.Service<ServerProcess, { readonly serving: Effect.Effect<Serving> }>()(
	"@antumbra/desktop/ServerProcess",
) {}

interface Running {
	readonly child: ChildProcessSpawner.ChildProcessHandle;
	readonly port: number;
}

const Readiness = Schema.fromJsonString(Schema.Struct({ port: Schema.Int }));

const restarts = Schedule.min([Schedule.exponential("500 millis"), Schedule.spaced("5 seconds")]);

const readiness = (output: Stream.Stream<Uint8Array, PlatformError.PlatformError>) =>
	output.pipe(
		Stream.decodeText(),
		Stream.splitLines,
		Stream.runHead,
		Effect.flatMap((line) => Schema.decodeUnknownEffect(Readiness)(Option.getOrUndefined(line))),
	);

const started = (bundle: string, directory: string, files: string, token: string, port: number) =>
	Effect.gen(function* () {
		const child = yield* ChildProcess.make(process.execPath, [bundle, "--data", directory, "--files", files, "--port", String(port)], {
			env: { ANTUMBRA_TOKEN: token, ELECTRON_RUN_AS_NODE: "1" },
			extendEnv: true,
			forceKillAfter: "5 seconds",
			killSignal: "SIGTERM",
			stderr: "inherit",
			stdout: "pipe",
		});
		const { port: listeningPort } = yield* readiness(child.stdout);
		yield* Effect.logInfo(`server: listening on port ${listeningPort}`);
		return { child, port: listeningPort };
	});

const restarting = (running: ScopedRef.ScopedRef<Running>, bundle: string, directory: string, files: string, token: string) =>
	Effect.gen(function* () {
		const { child, port } = yield* ScopedRef.get(running);
		yield* child.exitCode;
		yield* Effect.logWarning("server: the process ended; starting it again");
		yield* ScopedRef.set(running, started(bundle, directory, files, token, port));
	}).pipe(
		Effect.catchCause((cause) => Effect.logError("server: could not be started again", cause)),
		Effect.repeat({ schedule: restarts }),
	);

export const ServerProcessLive = (bundle: string, directory: string, files: string) =>
	Layer.effect(ServerProcess)(
		Effect.gen(function* () {
			const state = yield* ShellState;
			const { token, port } = state.identity;
			const running = yield* ScopedRef.fromAcquire(started(bundle, directory, files, token, port));
			yield* state.rememberPort((yield* ScopedRef.get(running)).port);
			yield* Effect.forkScoped(restarting(running, bundle, directory, files, token));
			return { serving: Effect.map(ScopedRef.get(running), ({ port }) => ({ port, token })) };
		}),
	).pipe(Layer.orDie);
