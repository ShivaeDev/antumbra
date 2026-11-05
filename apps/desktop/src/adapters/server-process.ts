import { join } from "node:path";
import type { Serving } from "@antumbra/platform-shell/bridge.ts";
import { Console, Context, Data, Effect, Fiber, Layer, Option, PubSub, Redacted, Schedule, Schema, ScopedRef, Stream } from "effect";
import { ChildProcess, type ChildProcessSpawner } from "effect/process";
import { app } from "electron";
import { Postgres } from "#adapters/postgres.ts";
import { ShellState } from "#adapters/shell-state.ts";
import { indexedAttributes } from "#adapters/tracing.ts";

export type { Serving } from "@antumbra/platform-shell/bridge.ts";

export class ServerProcess extends Context.Service<
	ServerProcess,
	{
		readonly serving: Effect.Effect<Serving & { readonly runnerToken: string; readonly socketPath: string }>;
		readonly restart: Effect.Effect<void>;
		readonly restarted: Stream.Stream<void>;
	}
>()("@antumbra/desktop/ServerProcess") {}

interface Running {
	readonly child: ChildProcessSpawner.ChildProcessHandle;
	readonly port: number;
	readonly token: string;
	readonly runnerToken: string;
	readonly socketPath: string;
}

export class ServerStartupFailed extends Data.TaggedError("ServerStartupFailed")<{ readonly message: string; readonly exitCode: number }> {}

const Readiness = Schema.fromJsonString(
	Schema.Struct({ port: Schema.Int, token: Schema.String, runnerToken: Schema.String, socketPath: Schema.String }),
);

const restarts = Schedule.min([Schedule.exponential("500 millis"), Schedule.spaced("5 seconds")]);

const ending: ChildProcess.KillOptions = { forceKillAfter: "5 seconds", killSignal: "SIGTERM" };

const started = (bundle: string, directory: string, files: string, port: number, databaseUrl: Redacted.Redacted<string>, rendererOrigin: string) =>
	Effect.gen(function* () {
		const child = yield* ChildProcess.make(process.execPath, [bundle, "--data", directory, "--files", files, "--port", String(port)], {
			...ending,
			env: {
				ELECTRON_RUN_AS_NODE: "1",
				ANTUMBRA_DATABASE_URL: Redacted.value(databaseUrl),
				ANTUMBRA_RENDERER_ORIGIN: rendererOrigin,
				NODE_ENV: app.isPackaged ? "production" : "development",
				PLATFORM_TRACE_STORE: join(files, "server-traces.db"),
				PLATFORM_TRACE_INDEXED_ATTRIBUTES: indexedAttributes.join(","),
			},
			extendEnv: true,
			stderr: "pipe",
			stdout: "pipe",
		});
		const diagnostics = yield* child.stderr.pipe(
			Stream.decodeText,
			Stream.tap((chunk) => Console.error(chunk)),
			Stream.runFold(
				() => "",
				(held, chunk) => (held + chunk).slice(-16384),
			),
			Effect.forkScoped,
		);
		const line = yield* child.stdout.pipe(Stream.decodeText, Stream.splitLines, Stream.runHead);
		if (Option.isNone(line))
			return yield* new ServerStartupFailed({
				exitCode: Number(yield* child.exitCode),
				message: (yield* Fiber.join(diagnostics)).trim() || "The Antumbra server exited before announcing its port.",
			});
		const announced = yield* Schema.decodeUnknownEffect(Readiness)(line.value);
		yield* Effect.logInfo(`server: listening on port ${announced.port}`);
		return { child, ...announced };
	});

const restarting = (
	running: ScopedRef.ScopedRef<Running>,
	bundle: string,
	directory: string,
	files: string,
	databaseUrl: Redacted.Redacted<string>,
	rendererOrigin: string,
	announce: Effect.Effect<void>,
) =>
	Effect.gen(function* () {
		const { child, port } = yield* ScopedRef.get(running);
		yield* child.exitCode;
		yield* Effect.logWarning("server: the process ended; starting it again");
		yield* ScopedRef.set(running, started(bundle, directory, files, port, databaseUrl, rendererOrigin));
		yield* announce;
	}).pipe(
		Effect.catchCause((cause) => Effect.logError("server: could not be started again", cause)),
		Effect.repeat({ schedule: restarts }),
	);

export const ServerProcessLive = (bundle: string, directory: string, files: string, rendererOrigin: string) =>
	Layer.effect(ServerProcess)(
		Effect.gen(function* () {
			const { url: databaseUrl } = yield* Postgres;
			const changed = yield* Effect.acquireRelease(PubSub.unbounded<void>(), PubSub.shutdown);
			const state = yield* ShellState;
			const { port } = state.identity;
			const running = yield* ScopedRef.fromAcquire(started(bundle, directory, files, port, databaseUrl, rendererOrigin));
			yield* state.rememberPort((yield* ScopedRef.get(running)).port);
			yield* Effect.forkScoped(
				restarting(running, bundle, directory, files, databaseUrl, rendererOrigin, PubSub.publish(changed, undefined).pipe(Effect.asVoid)),
			);
			return {
				restarted: Stream.fromPubSub(changed),
				restart: ScopedRef.get(running).pipe(
					Effect.flatMap(({ child }) => child.kill(ending)),
					Effect.ignore,
				),
				serving: Effect.map(ScopedRef.get(running), ({ child: _child, ...serving }) => serving),
			};
		}),
	).pipe(Layer.orDie);
