import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import type { OpencodeConnection } from "#adapters/connection.ts";
import { openEventStream } from "#adapters/event-stream.ts";
import { httpCalls } from "#adapters/http.ts";
import { listeningUrl } from "#adapters/listening.ts";
import { openRelay } from "#adapters/relay.ts";

export interface ServeOptions {
	readonly command: string;
	readonly cwd: string;
}

// why: the server the app starts is its own, on a port the OS picks and behind
// a password minted for this run. opencode itself warns that an unsecured
// listener is reachable by anything else on the machine, and a fixed port
// would collide with an opencode the admiral started for themselves.
const SERVE_ARGS = ["serve", "--port", "0", "--hostname", "127.0.0.1"];

// why: the password reaches the child through env(1), which adds to the
// environment it inherits. Handing node an `env` map instead would replace
// that environment wholesale, and opencode reads the user's provider
// credentials, HOME and PATH out of it.
const ENV = "/usr/bin/env";

const connectionTo = (
	baseUrl: string,
	password: string,
	stop: () => void,
	exits: ReturnType<typeof openRelay<void>>,
): OpencodeConnection => {
	const calls = httpCalls(baseUrl, password);
	const frames = openRelay<unknown>();
	const closeStream = openEventStream(`${baseUrl}/global/event`, password, {
		onEnd: () => exits.send(undefined),
		onFrame: frames.send,
	});
	return {
		close: () => {
			closeStream();
			stop();
		},
		get: calls.get,
		onEvent: frames.listen,
		onExit: (listener) => exits.listen(listener),
		post: calls.post,
	};
};

// why: the child announces the address it settled on as a line of stdout and
// nowhere else, so starting the server is waiting for that line. A child that
// exits first never had an address, and its stderr is the only account of why.
export const serveOpencode =
	(options: ServeOptions) => (): Promise<OpencodeConnection> => {
		const password = randomBytes(24).toString("hex");
		const child = spawn(
			ENV,
			[`OPENCODE_SERVER_PASSWORD=${password}`, options.command, ...SERVE_ARGS],
			{ cwd: options.cwd, stdio: ["ignore", "pipe", "pipe"] },
		);
		const exits = openRelay<void>();
		child.on("exit", () => exits.send(undefined));
		child.on("error", () => exits.send(undefined));
		return new Promise<OpencodeConnection>((resolve, reject) => {
			let complaints = "";
			child.stderr.setEncoding("utf8");
			child.stderr.on("data", (text: string) => {
				complaints += text;
			});
			child.stdout.setEncoding("utf8");
			child.stdout.on("data", (chunk: string) => {
				const address = listeningUrl(chunk);
				if (address !== undefined) {
					resolve(
						connectionTo(address, password, () => child.kill("SIGTERM"), exits),
					);
				}
			});
			child.on("exit", (code) =>
				reject(
					new Error(
						`opencode serve exited with ${code}: ${complaints.slice(0, 500)}`,
					),
				),
			);
			child.on("error", reject);
		});
	};
