import { spawn } from "node:child_process";
import { Effect } from "effect";

const fields = "headRefOid,mergeable,reviewDecision,state,statusCheckRollup";

const toError = (cause: unknown): Error => (cause instanceof Error ? cause : new Error(String(cause)));

const runGh = (args: readonly string[]): Effect.Effect<string, Error> =>
	Effect.callback((resume, signal) => {
		const child = spawn("gh", [...args], { stdio: ["ignore", "pipe", "pipe"] });
		const out: Buffer[] = [];
		const err: Buffer[] = [];
		let settled = false;
		const finish = (result: Effect.Effect<string, Error>): void => {
			if (!settled) {
				settled = true;
				resume(result);
			}
		};
		child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
		child.stderr.on("data", (chunk: Buffer) => err.push(chunk));
		child.on("error", (cause) => finish(Effect.fail(toError(cause))));
		child.on("close", (code) => {
			const stdout = Buffer.concat(out).toString("utf8").trim();
			const stderr = Buffer.concat(err).toString("utf8").trim();
			if (code === 0) {
				finish(Effect.succeed(stdout));
			} else {
				finish(Effect.fail(new Error(stderr === "" ? `gh exited with code ${code ?? 1}` : stderr)));
			}
		});
		signal.addEventListener("abort", () => child.kill("SIGTERM"));
	});

export const viewPullRequest = (spec: string): Effect.Effect<string, Error> => runGh(["pr", "view", spec, "--json", fields]);
