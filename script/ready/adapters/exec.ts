import { spawn } from "node:child_process";
import { Effect } from "effect";
import type { Exec, StepResult } from "#ready/model.ts";

export const execStep: Exec = (step) =>
	Effect.callback((resume, signal) => {
		const child = spawn(step.command, [...step.args], {
			stdio: ["ignore", "pipe", "pipe"],
		});
		const chunks: Buffer[] = [];
		let settled = false;
		const finish = (result: StepResult): void => {
			if (!settled) {
				settled = true;
				resume(Effect.succeed(result));
			}
		};
		child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
		child.stderr.on("data", (chunk: Buffer) => chunks.push(chunk));
		child.on("error", (cause) => finish({ exitCode: 1, output: String(cause) }));
		child.on("close", (code) =>
			finish({
				exitCode: code ?? 1,
				output: Buffer.concat(chunks).toString("utf8"),
			}),
		);
		signal.addEventListener("abort", () => child.kill("SIGTERM"));
	});
