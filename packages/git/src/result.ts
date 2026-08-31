import { Effect } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import { GitAuthRequired, GitCommandFailed, type GitOperation } from "#errors.ts";

interface ProcessOutput {
	readonly exitCode: ChildProcessSpawner.ExitCode;
	readonly stderr: string;
	readonly stdout: string;
}

const authMarkers = [
	"authentication failed",
	"authentication is required",
	"authorization prompt",
	"could not read password",
	"could not read username",
	"invalid username or password",
	"permission denied (publickey",
	"terminal prompts disabled",
] as const;

const needsAuthentication = (detail: string): boolean => {
	const normalized = detail.toLowerCase();
	if (authMarkers.some((marker) => normalized.includes(marker))) {
		return true;
	}
	return normalized.includes("credential") && (normalized.includes("expired") || normalized.includes("locked"));
};

export const acceptProcessOutput = (operation: GitOperation, output: ProcessOutput): Effect.Effect<string, GitAuthRequired | GitCommandFailed> => {
	if (output.exitCode === 0) {
		return Effect.succeed(output.stdout);
	}
	const detail = output.stderr.trim() || output.stdout.trim() || `git exited with code ${output.exitCode}`;
	if (needsAuthentication(detail)) {
		return Effect.fail(new GitAuthRequired({ detail, operation }));
	}
	return Effect.fail(
		new GitCommandFailed({
			detail,
			exitCode: output.exitCode,
			operation,
		}),
	);
};
