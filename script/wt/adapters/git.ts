import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Effect } from "effect";

const toError = (cause: unknown): Error => (cause instanceof Error ? cause : new Error(String(cause)));

export const runGit = (args: readonly string[], cwd: string): Effect.Effect<string, Error> =>
	Effect.callback((resume, signal) => {
		const child = spawn("git", [...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
		const chunks: Buffer[] = [];
		let settled = false;
		const finish = (result: Effect.Effect<string, Error>): void => {
			if (!settled) {
				settled = true;
				resume(result);
			}
		};
		child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
		child.stderr.on("data", (chunk: Buffer) => chunks.push(chunk));
		child.on("error", (cause) => finish(Effect.fail(toError(cause))));
		child.on("close", (code) => {
			const output = Buffer.concat(chunks).toString("utf8").trim();
			if (code === 0) {
				finish(Effect.succeed(output));
			} else {
				finish(Effect.fail(new Error(output === "" ? `git exited with code ${code ?? 1}` : output)));
			}
		});
		signal.addEventListener("abort", () => child.kill("SIGTERM"));
	});

export const makeParentDirectory = (target: string): Effect.Effect<void, Error> =>
	Effect.tryPromise({
		catch: toError,
		try: () => mkdir(dirname(target), { recursive: true }).then(() => undefined),
	});
