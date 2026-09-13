import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Layer, Queue, Sink, Stream } from "effect";
import { type ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { vi } from "vitest";
import { RunnerProcess, RunnerProcessLayer } from "#adapters/runner-process.ts";
import { ServerProcess, ServerProcessLive } from "#adapters/server-process.ts";
import { ShellState } from "#adapters/shell-state.ts";

vi.mock("electron", () => ({ app: { isPackaged: false } }));

const SERVER_ARGS = ["/server.js", "--data", "/data/server", "--files", "/data"];

const bundleOf = (command: ChildProcess.Command): string => (command._tag === "StandardCommand" ? (command.args[0] ?? "") : "");

interface Spawns {
	readonly ends: Queue.Queue<Deferred.Deferred<ChildProcessSpawner.ExitCode>>;
	readonly requests: Queue.Queue<ChildProcess.Command>;
	readonly spawner: ChildProcessSpawner.ChildProcessSpawner["Service"];
	readonly terminated: readonly string[];
}

const spawns = Effect.gen(function* () {
	const requests = yield* Queue.unbounded<ChildProcess.Command>();
	const ends = yield* Queue.unbounded<Deferred.Deferred<ChildProcessSpawner.ExitCode>>();
	const terminated: string[] = [];
	const spawner = ChildProcessSpawner.make((command) =>
		Effect.acquireRelease(
			Effect.gen(function* () {
				yield* Queue.offer(requests, command);
				const end = yield* Deferred.make<ChildProcessSpawner.ExitCode>();
				if (bundleOf(command) === "/server.js") yield* Queue.offer(ends, end);
				return {
					command,
					handle: ChildProcessSpawner.makeHandle({
						all: Stream.empty,
						exitCode: Deferred.await(end),
						getInputFd: () => Sink.drain,
						getOutputFd: () => Stream.empty,
						isRunning: Effect.succeed(true),
						kill: () => Effect.asVoid(Deferred.succeed(end, ChildProcessSpawner.ExitCode(0))),
						pid: ChildProcessSpawner.ProcessId(1),
						stderr: Stream.empty,
						stdin: Sink.drain,
						stdout: Stream.make(new TextEncoder().encode('{"port":49123}\n')),
						unref: Effect.succeed(Effect.void),
					}),
				};
			}),
			({ command }) =>
				Effect.sync(() => {
					terminated.push(bundleOf(command));
				}),
		).pipe(Effect.map((value) => value.handle)),
	);
	return { ends, requests, spawner, terminated } satisfies Spawns;
});

const siblings = (spawner: ChildProcessSpawner.ChildProcessSpawner["Service"], remembered: number[]) => {
	const state = Layer.succeed(ShellState, {
		identity: { port: 0, token: "token", runnerId: "runner-id", logId: "log-id" },
		rememberPort: (port) =>
			Effect.sync(() => {
				remembered.push(port);
			}),
	});
	const server = ServerProcessLive("/server.js", "/data/server", "/data");
	return Layer.merge(server, RunnerProcessLayer("/runner.js", "/data").pipe(Layer.provide(server))).pipe(
		Layer.provide(state),
		Layer.provide(Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, spawner)),
	);
};

it.effect("restarts the server on its chosen endpoint without replacing its sibling runner", () =>
	Effect.gen(function* () {
		const { ends, requests, spawner, terminated } = yield* spawns;
		const remembered: number[] = [];
		yield* Effect.scoped(
			Effect.gen(function* () {
				yield* ServerProcess;
				yield* RunnerProcess;
				const first = yield* Queue.take(requests);
				const runner = yield* Queue.take(requests);
				expect(first).toMatchObject({ args: [...SERVER_ARGS, "--port", "0"] });
				expect(runner).toMatchObject({
					args: [
						"/runner.js",
						"--data",
						"/data",
						"--assets",
						"/",
						"--server",
						"ws://127.0.0.1:49123/rpc",
						"--runner-id",
						"runner-id",
						"--log-id",
						"log-id",
					],
				});
				yield* Deferred.succeed(yield* Queue.take(ends), ChildProcessSpawner.ExitCode(1));
				expect(yield* Queue.take(requests)).toMatchObject({ args: [...SERVER_ARGS, "--port", "49123"] });
				expect(terminated).not.toContain("/runner.js");
			}).pipe(Effect.provide(siblings(spawner, remembered))),
		);
		expect(remembered).toEqual([49123]);
		expect(terminated).toContain("/runner.js");
	}),
);

it.effect("starts the server again when the act asks for it and leaves the runner alone", () =>
	Effect.gen(function* () {
		const { requests, spawner, terminated } = yield* spawns;
		yield* Effect.scoped(
			Effect.gen(function* () {
				const server = yield* ServerProcess;
				yield* RunnerProcess;
				yield* Queue.take(requests);
				yield* Queue.take(requests);

				yield* server.restart;

				expect(yield* Queue.take(requests)).toMatchObject({ args: [...SERVER_ARGS, "--port", "49123"] });
				expect(terminated).not.toContain("/runner.js");
			}).pipe(Effect.provide(siblings(spawner, []))),
		);
	}),
);
