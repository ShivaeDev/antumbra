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

// why: app-server speaks newline-delimited JSON on stdio; this is the only
// place a raw child process exists — everything above it sees lines.
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
		// why: app-server exits when its stdio connection closes — ending stdin
		// is the polite stop; SIGTERM covers a child that does not.
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
