import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Layer, Sink, Stream } from "effect";
import { TestClock } from "effect/testing";
import { type ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { afterEach, vi } from "vitest";
import { serveOpencode } from "#adapters/serve.ts";

interface Script {
	readonly exitCode: Effect.Effect<ChildProcessSpawner.ExitCode>;
	readonly stderr: string;
	readonly stdout: string;
}

const ANNOUNCED = "http://127.0.0.1:4096";

const LISTENING = `opencode server listening on ${ANNOUNCED}\n`;

const OPTIONS = {
	command: "/opt/homebrew/bin/opencode",
	cwd: "/moorage",
	plugin: "/antumbra/opencode/caller-session.js",
	skills: "/antumbra/skills",
	tools: "http://127.0.0.1:52001",
};

const bytes = (text: string) => Stream.fromIterable([new TextEncoder().encode(text)]);

const opencodeThat = (script: Script) => {
	const spawned: Array<ChildProcess.Command> = [];
	let running = () => {};
	const started = new Promise<void>((resolve) => {
		running = resolve;
	});
	const service = ChildProcessSpawner.make((command) =>
		Effect.sync(() => {
			spawned.push(command);
			running();
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
	return { layer: Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, service), spawned, started };
};

afterEach(() => vi.unstubAllGlobals());

it.effect("asks for a port the machine handed out, naming Antumbra's skills, tool server and plugin in its config", () =>
	Effect.gen(function* () {
		const fake = opencodeThat({ exitCode: Effect.never, stderr: "", stdout: LISTENING });
		yield* Effect.scoped(Effect.provide(serveOpencode(OPTIONS), fake.layer));
		expect(fake.spawned).toMatchObject([
			{
				args: ["serve", "--port", expect.stringMatching(/^[1-9][0-9]*$/), "--hostname", "127.0.0.1"],
				command: "/opt/homebrew/bin/opencode",
				options: {
					env: {
						OPENCODE_CONFIG_CONTENT: JSON.stringify({
							mcp: { antumbra: { timeout: 300_000, type: "remote", url: "http://127.0.0.1:52001" } },
							plugin: ["file:///antumbra/opencode/caller-session.js"],
							skills: { paths: ["/antumbra/skills"] },
						}),
					},
					extendEnv: true,
				},
			},
		]);
	}),
);

it.effect("calls the server where it announced it is listening rather than where Antumbra asked it to listen", () =>
	Effect.gen(function* () {
		const called: Array<string> = [];
		vi.stubGlobal("fetch", (address: string) => {
			called.push(address);
			return Promise.resolve(new Response("{}"));
		});
		const fake = opencodeThat({ exitCode: Effect.never, stderr: "", stdout: LISTENING });
		yield* Effect.scoped(
			Effect.gen(function* () {
				const connection = yield* Effect.provide(serveOpencode(OPTIONS), fake.layer);
				yield* Effect.promise(() => connection.get({ body: undefined, path: "/config", query: {} }));
			}),
		);
		expect(called).toEqual([`${ANNOUNCED}/config`]);
	}),
);

it.effect("fails with what the server complained about when it exits before listening", () =>
	Effect.gen(function* () {
		const fake = opencodeThat({ exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(1)), stderr: "address already in use", stdout: "" });
		const failure = yield* Effect.flip(Effect.scoped(Effect.provide(serveOpencode(OPTIONS), fake.layer)));
		expect(failure.detail).toBe("opencode serve exited with 1: address already in use");
	}),
);

it.effect("gives up when the server neither announces an address nor exits", () =>
	Effect.gen(function* () {
		const fake = opencodeThat({ exitCode: Effect.never, stderr: "", stdout: "" });
		const attempt = yield* Effect.forkChild(Effect.flip(Effect.scoped(Effect.provide(serveOpencode(OPTIONS), fake.layer))));
		yield* Effect.promise(() => fake.started);
		yield* TestClock.adjust(30_000);
		const failure = yield* Fiber.join(attempt);
		expect(failure.detail).toMatch(/^opencode serve did not print its address on port [0-9]+ in time$/);
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
