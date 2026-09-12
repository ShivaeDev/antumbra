import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Layer, Queue, Sink, Stream } from "effect";
import { type ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { RunnerProcess, RunnerProcessLayer } from "#adapters/runner-process.ts";
import { ServerProcess, ServerProcessLive } from "#adapters/server-process.ts";
import { ShellState } from "#adapters/shell-state.ts";

it.effect("restarts the server on its chosen endpoint without replacing its sibling runner", () =>
	Effect.gen(function* () {
		const requests = yield* Queue.unbounded<ChildProcess.Command>();
		const exit = yield* Deferred.make<ChildProcessSpawner.ExitCode>();
		const terminated: string[] = [];
		const remembered: number[] = [];
		let servers = 0;
		const spawner = ChildProcessSpawner.make((command) =>
			Effect.acquireRelease(
				Effect.gen(function* () {
					yield* Queue.offer(requests, command);
					const server = command._tag === "StandardCommand" && command.args[0] === "/server.js";
					if (server) servers += 1;
					return {
						command,
						handle: ChildProcessSpawner.makeHandle({
							all: Stream.empty,
							exitCode: server && servers === 1 ? Deferred.await(exit) : Effect.never,
							getInputFd: () => Sink.drain,
							getOutputFd: () => Stream.empty,
							isRunning: Effect.succeed(true),
							kill: () => Effect.void,
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
						if (command._tag === "StandardCommand") terminated.push(command.args[0] ?? "");
					}),
			).pipe(Effect.map((value) => value.handle)),
		);
		const state = Layer.succeed(ShellState, {
			identity: { port: 0, token: "token", runnerId: "runner-id", logId: "log-id" },
			rememberPort: (port) =>
				Effect.sync(() => {
					remembered.push(port);
				}),
		});
		const server = ServerProcessLive("/server.js", "/data/server", "/data");
		const layers = Layer.merge(server, RunnerProcessLayer("/runner.js", "/data").pipe(Layer.provide(server))).pipe(
			Layer.provide(state),
			Layer.provide(Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, spawner)),
		);
		yield* Effect.scoped(
			Effect.gen(function* () {
				yield* ServerProcess;
				yield* RunnerProcess;
				const first = yield* Queue.take(requests);
				const runner = yield* Queue.take(requests);
				expect(first).toMatchObject({ args: ["/server.js", "--data", "/data/server", "--files", "/data", "--port", "0"] });
				expect(runner).toMatchObject({
					args: ["/runner.js", "--data", "/data", "--server", "ws://127.0.0.1:49123/rpc", "--runner-id", "runner-id", "--log-id", "log-id"],
				});
				yield* Deferred.succeed(exit, ChildProcessSpawner.ExitCode(1));
				expect(yield* Queue.take(requests)).toMatchObject({ args: ["/server.js", "--data", "/data/server", "--files", "/data", "--port", "49123"] });
				expect(terminated).not.toContain("/runner.js");
			}).pipe(Effect.provide(layers)),
		);
		expect(remembered).toEqual([49123]);
		expect(terminated).toContain("/runner.js");
	}),
);
