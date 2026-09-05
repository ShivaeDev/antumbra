import { pathToFileURL } from "node:url";
import { Deferred, Effect, Fiber, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import type { OpencodeConnection } from "#adapters/connection.ts";
import { openEventStream } from "#adapters/event-stream.ts";
import { httpCalls } from "#adapters/http.ts";
import { listeningUrl } from "#adapters/listening.ts";
import { freeLoopbackPort, LOOPBACK } from "#adapters/loopback.ts";
import { CONSTRAINED_AGENT, TOOL_SERVER_NAME } from "#adapters/tool-server.ts";
import { opencodeFailure } from "#failure.ts";

interface ServeOptions {
	readonly command: string;
	readonly constrained: boolean;
	readonly cwd: string;
	readonly plugin: string;
	readonly skills: string;
	readonly tools: string;
}

const serveArgs = (port: string) => ["serve", "--port", port, "--hostname", LOOPBACK];

const START_PATIENCE_MILLIS = 30_000;

// A tool call carries a whole domain act, so the server waits far longer for one than opencode's five-second default.
const TOOL_TIMEOUT = 300_000;

// opencode reads these once per process. `OPENCODE_PURE` is not among them: it would drop the caller-session plugin and the tool server with the
// admiral's own extensions.
const CONSTRAINED_ENV = {
	OPENCODE_DISABLE_CLAUDE_CODE_PROMPT: "1",
	OPENCODE_DISABLE_EXTERNAL_SKILLS: "1",
	OPENCODE_DISABLE_PROJECT_CONFIG: "1",
};

const CONSTRAINED_CONFIG = {
	agent: { [CONSTRAINED_AGENT]: { prompt: "Follow the instructions in the system message." } },
};

const configContent = (options: ServeOptions): string =>
	JSON.stringify({
		mcp: { [TOOL_SERVER_NAME]: { timeout: TOOL_TIMEOUT, type: "remote", url: options.tools } },
		plugin: [pathToFileURL(options.plugin).href],
		...(options.constrained ? CONSTRAINED_CONFIG : { skills: { paths: [options.skills] } }),
	});

const serveEnv = (options: ServeOptions) => ({
	OPENCODE_CONFIG_CONTENT: configContent(options),
	...(options.constrained ? CONSTRAINED_ENV : {}),
});

const connectionTo = (baseUrl: string, watchExit: (listener: () => void) => void): OpencodeConnection => {
	const calls = httpCalls(baseUrl);
	let closeStream = () => {};
	let exit = () => {};
	return {
		close: () => closeStream(),
		get: calls.get,
		onEvent: (listeners) => {
			closeStream = openEventStream(`${baseUrl}/global/event`, {
				onEnd: () => exit(),
				...listeners,
			});
		},
		onExit: (listener) => {
			exit = listener;
			watchExit(listener);
		},
		post: calls.post,
	};
};

const complaintsOf = Effect.fnUntraced(function* (child: ChildProcessSpawner.ChildProcessHandle) {
	const said = yield* Effect.forkScoped(Stream.mkString(Stream.decodeText(child.stderr)));
	return Effect.orElseSucceed(Fiber.join(said), () => "");
});

const addressPrintedBy = Effect.fnUntraced(function* (child: ChildProcessSpawner.ChildProcessHandle) {
	const printed = yield* Deferred.make<string>();
	yield* Effect.forkScoped(
		Stream.runForEach(Stream.decodeText(child.stdout), (chunk) =>
			Effect.sync(() => {
				const address = listeningUrl(chunk);
				if (address !== undefined) {
					Deferred.doneUnsafe(printed, Effect.succeed(address));
				}
			}),
		),
	);
	return Deferred.await(printed);
});

const exitedFirst = (child: ChildProcessSpawner.ChildProcessHandle, complaints: Effect.Effect<string>) =>
	Effect.flatMap(Effect.match(child.exitCode, { onFailure: String, onSuccess: String }), (reason) =>
		Effect.flatMap(complaints, (said) => Effect.fail(`opencode serve exited with ${reason}: ${said.slice(0, 500)}`)),
	);

export const serveOpencode = Effect.fnUntraced(function* (options: ServeOptions) {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
	const port = yield* freeLoopbackPort;
	const child = yield* spawner.spawn(
		ChildProcess.make(options.command, serveArgs(port), {
			cwd: options.cwd,
			env: serveEnv(options),
			extendEnv: true,
			forceKillAfter: 5_000,
			stdin: "ignore",
		}),
	);
	const complaints = yield* complaintsOf(child);
	const printed = yield* addressPrintedBy(child);
	let exited = () => {};
	yield* Effect.forkScoped(
		Effect.andThen(
			Effect.exit(child.exitCode),
			Effect.sync(() => exited()),
		),
	);
	const address = yield* Effect.raceFirst(printed, exitedFirst(child, complaints)).pipe(
		Effect.timeoutOrElse({
			duration: START_PATIENCE_MILLIS,
			orElse: () => Effect.fail(`opencode serve did not print its address on port ${port} in time`),
		}),
	);
	return connectionTo(address, (listener) => {
		exited = listener;
	});
}, Effect.mapError(opencodeFailure));
