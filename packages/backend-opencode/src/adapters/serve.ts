import { spawn } from "node:child_process";
import type { OpencodeConnection } from "#adapters/connection.ts";
import { openEventStream } from "#adapters/event-stream.ts";
import { httpCalls } from "#adapters/http.ts";
import { listeningUrl } from "#adapters/listening.ts";

export interface ServeOptions {
	readonly command: string;
	readonly cwd: string;
}

const SERVE_ARGS = ["serve", "--port", "0", "--hostname", "127.0.0.1"];

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
		onEvent: (listener) => {
			closeStream = openEventStream(`${baseUrl}/global/event`, {
				onEnd: () => exit(),
				onFrame: listener,
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
	const child = spawn(options.command, SERVE_ARGS, { cwd: options.cwd, stdio: ["ignore", "pipe", "pipe"] });
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
