import { spawn } from "node:child_process";
import type { OpencodeConnection } from "#adapters/connection.ts";
import { openEventStream } from "#adapters/event-stream.ts";
import { httpCalls } from "#adapters/http.ts";
import { listeningUrl } from "#adapters/listening.ts";

interface ServeOptions {
	readonly command: string;
	readonly cwd: string;
	readonly skills: string;
}

const SERVE_ARGS = ["serve", "--port", "0", "--hostname", "127.0.0.1"];

// A child given its own environment loses the one it would have inherited, so the shell adds the single variable and `exec` keeps the server the
// process Antumbra spawned. OpenCode merges this config over the machine's own, which adds Antumbra's skills without editing the user's file.
const ADD_CONFIG = 'export OPENCODE_CONFIG_CONTENT="$1"; shift; exec "$0" "$@"';

export const serveCommand = (command: string, skills: string) => ({
	args: ["-c", ADD_CONFIG, command, JSON.stringify({ skills: { paths: [skills] } }), ...SERVE_ARGS],
	command: "/bin/sh",
});

const connectionTo = (baseUrl: string, stop: () => void, onExit: (listener: () => void) => void): OpencodeConnection => {
	const calls = httpCalls(baseUrl);
	let closeStream = () => {};
	let exit = () => {};
	return {
		close: () => {
			closeStream();
			stop();
		},
		get: calls.get,
		onEvent: (listeners) => {
			closeStream = openEventStream(`${baseUrl}/global/event`, {
				onEnd: () => exit(),
				...listeners,
			});
		},
		onExit: (listener) => {
			exit = listener;
			onExit(listener);
		},
		post: calls.post,
	};
};

export const serveOpencode = (options: ServeOptions) => (): Promise<OpencodeConnection> => {
	const serve = serveCommand(options.command, options.skills);
	const child = spawn(serve.command, serve.args, { cwd: options.cwd, stdio: ["ignore", "pipe", "pipe"] });
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
					connectionTo(
						address,
						() => child.kill("SIGTERM"),
						(listener) => {
							child.once("exit", listener);
							child.once("error", listener);
						},
					),
				);
			}
		});
		child.on("exit", (code) => reject(new Error(`opencode serve exited with ${code}: ${complaints.slice(0, 500)}`)));
		child.on("error", reject);
	});
};
