import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Layer, Sink, Stream } from "effect";
import { type ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { serveOpencode } from "#adapters/serve.ts";

interface Script {
	readonly exitCode: Effect.Effect<ChildProcessSpawner.ExitCode>;
	readonly stderr: string;
	readonly stdout: string;
}

const LISTENING = "opencode server listening on http://127.0.0.1:51491\n";

const OPTIONS = { command: "/opt/homebrew/bin/opencode", cwd: "/moorage", skills: "/antumbra/skills" };

const bytes = (text: string) => Stream.fromIterable([new TextEncoder().encode(text)]);

const opencodeThat = (script: Script) => {
	const spawned: Array<ChildProcess.Command> = [];
	const service = ChildProcessSpawner.make((command) =>
		Effect.sync(() => {
			spawned.push(command);
			return ChildProcessSpawner.makeHandle({
				all: Stream.empty,
				exitCode: script.exitCode,
				getInputFd: () => Sink.drain,
				getOutputFd: () => Stream.empty,
				isRunning: Effect.succeed(true),
				kill: () => Effect.void,
				pid: ChildProcessSpawner.ProcessId(1),
				stderr: bytes(script.stderr),
				stdin: Sink.drain,
				stdout: bytes(script.stdout),
				unref: Effect.succeed(Effect.void),
			});
		}),
	);
	return { layer: Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, service), spawned };
};

it.effect("starts the server on a free local port with Antumbra's skills in its config", () =>
	Effect.gen(function* () {
		const fake = opencodeThat({ exitCode: Effect.never, stderr: "", stdout: LISTENING });
		yield* Effect.scoped(Effect.provide(serveOpencode(OPTIONS), fake.layer));
		expect(fake.spawned).toMatchObject([
			{
				args: ["serve", "--port", "0", "--hostname", "127.0.0.1"],
				command: "/opt/homebrew/bin/opencode",
				options: {
					env: { OPENCODE_CONFIG_CONTENT: '{"skills":{"paths":["/antumbra/skills"]}}' },
					extendEnv: true,
				},
			},
		]);
	}),
);

it.effect("fails with what the server complained about when it exits before listening", () =>
	Effect.gen(function* () {
		const fake = opencodeThat({ exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(1)), stderr: "address already in use", stdout: "" });
		const failure = yield* Effect.flip(Effect.scoped(Effect.provide(serveOpencode(OPTIONS), fake.layer)));
		expect(failure.detail).toBe("opencode serve exited with 1: address already in use");
	}),
);

it.effect("connects once the server prints its address and reports the later exit", () =>
	Effect.gen(function* () {
		const stopping = yield* Deferred.make<ChildProcessSpawner.ExitCode>();
		const fake = opencodeThat({ exitCode: Deferred.await(stopping), stderr: "", stdout: LISTENING });
		const noticed = yield* Deferred.make<void>();
		yield* Effect.scoped(
			Effect.gen(function* () {
				const connection = yield* Effect.provide(serveOpencode(OPTIONS), fake.layer);
				connection.onExit(() => {
					Deferred.doneUnsafe(noticed, Effect.void);
				});
				yield* Deferred.succeed(stopping, ChildProcessSpawner.ExitCode(0));
				yield* Deferred.await(noticed);
			}),
		);
	}),
);
