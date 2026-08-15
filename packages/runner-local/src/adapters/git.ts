import { execFile } from "node:child_process";
import { RunnerFailure } from "@antumbra/plugin-api";
import { Effect } from "effect";

export const git = (
	args: readonly string[],
): Effect.Effect<string, RunnerFailure> =>
	Effect.callback((resume) => {
		execFile("git", [...args], (error, stdout, stderr) => {
			if (error === null) {
				resume(Effect.succeed(stdout));
				return;
			}
			resume(
				Effect.fail(
					new RunnerFailure({
						detail: `git ${args.join(" ")}: ${stderr.trim() === "" ? String(error) : stderr.trim()}`,
						tag: "local",
					}),
				),
			);
		});
	});
