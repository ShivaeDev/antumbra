import { Context, Effect, Layer, Option, type PlatformError, Schedule, Schema, ScopedRef, Stream } from "effect";
import { ChildProcess, type ChildProcessSpawner } from "effect/unstable/process";

export interface Serving {
	readonly port: number;
	readonly token: string;
}

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

const started = (bundle: string, directory: string, token: string) =>
	Effect.gen(function* () {
		const child = yield* ChildProcess.make(process.execPath, [bundle, "--data", directory], {
			env: { ANTUMBRA_TOKEN: token, ELECTRON_RUN_AS_NODE: "1" },
			extendEnv: true,
			forceKillAfter: "5 seconds",
			killSignal: "SIGTERM",
			stderr: "inherit",
			stdout: "pipe",
		});
		const { port } = yield* readiness(child.stdout);
		yield* Effect.logInfo(`server: listening on port ${port}`);
		return { child, port };
	});

const restarting = (running: ScopedRef.ScopedRef<Running>, bundle: string, directory: string, token: string) =>
	Effect.gen(function* () {
		const { child } = yield* ScopedRef.get(running);
		yield* child.exitCode;
		yield* Effect.logWarning("server: the process ended; starting it again");
		yield* ScopedRef.set(running, started(bundle, directory, token));
	}).pipe(
		Effect.catchCause((cause) => Effect.logError("server: could not be started again", cause)),
		Effect.repeat({ schedule: restarts }),
	);

export const ServerProcessLive = (bundle: string, directory: string) =>
	Layer.effect(ServerProcess)(
		Effect.gen(function* () {
			const token = yield* Effect.sync(() => crypto.randomUUID());
			const running = yield* ScopedRef.fromAcquire(started(bundle, directory, token));
			yield* Effect.forkScoped(restarting(running, bundle, directory, token));
			return { serving: Effect.map(ScopedRef.get(running), ({ port }) => ({ port, token })) };
		}),
	).pipe(Layer.orDie);
