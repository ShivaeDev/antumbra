import { spawn } from "node:child_process";

export interface LineProcess {
	readonly kill: () => void;
	readonly onExit: (listener: (code: number | null) => void) => void;
	readonly onLine: (listener: (line: string) => void) => void;
	readonly onStderr: (listener: (text: string) => void) => void;
	readonly write: (line: string) => void;
}

interface SpawnLineProcessOptions {
	readonly args: ReadonlyArray<string>;
	readonly command: string;
	readonly cwd: string;
}

// Codex app-server uses newline-delimited JSON over stdio.
export const spawnLineProcess = (options: SpawnLineProcessOptions): LineProcess => {
	const child = spawn(options.command, [...options.args], {
		cwd: options.cwd,
		stdio: ["pipe", "pipe", "pipe"],
	});
	let lineListener: ((line: string) => void) | null = null;
	let stderrListener: ((text: string) => void) | null = null;
	let exitListener: ((code: number | null) => void) | null = null;
	let buffer = "";
	child.stdout.setEncoding("utf8");
	child.stdout.on("data", (chunk: string) => {
		buffer += chunk;
		let newline = buffer.indexOf("\n");
		while (newline >= 0) {
			const line = buffer.slice(0, newline).trim();
			buffer = buffer.slice(newline + 1);
			if (line.length > 0) {
				lineListener?.(line);
			}
			newline = buffer.indexOf("\n");
		}
	});
	child.stderr.setEncoding("utf8");
	child.stderr.on("data", (chunk: string) => stderrListener?.(chunk));
	child.on("exit", (code) => exitListener?.(code));
	child.on("error", () => exitListener?.(null));
	return {
		// Closing stdin lets app-server exit cleanly; SIGTERM handles a child that remains alive.
		kill: () => {
			child.stdin.end();
			child.kill("SIGTERM");
		},
		onExit: (listener) => {
			exitListener = listener;
		},
		onLine: (listener) => {
			lineListener = listener;
		},
		onStderr: (listener) => {
			stderrListener = listener;
		},
		write: (line) => {
			child.stdin.write(`${line}\n`);
		},
	};
};
