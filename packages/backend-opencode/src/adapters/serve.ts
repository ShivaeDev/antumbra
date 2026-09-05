import { Deferred, Effect, Fiber, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import type { OpencodeConnection } from "#adapters/connection.ts";
import { openEventStream } from "#adapters/event-stream.ts";
import { httpCalls } from "#adapters/http.ts";
import { listeningUrl } from "#adapters/listening.ts";
import { opencodeFailure } from "#failure.ts";

interface ServeOptions {
	readonly command: string;
	readonly cwd: string;
	readonly skills: string;
}

const SERVE_ARGS = ["serve", "--port", "0", "--hostname", "127.0.0.1"];

const configContent = (skills: string): string => JSON.stringify({ skills: { paths: [skills] } });

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
	const child = yield* spawner.spawn(
		ChildProcess.make(options.command, SERVE_ARGS, {
			cwd: options.cwd,
			env: { OPENCODE_CONFIG_CONTENT: configContent(options.skills) },
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
	const address = yield* Effect.raceFirst(printed, exitedFirst(child, complaints));
	return connectionTo(address, (listener) => {
		exited = listener;
	});
}, Effect.mapError(opencodeFailure));
