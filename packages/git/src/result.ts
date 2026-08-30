import { Effect, Schema } from "effect";
import { GitAuthRequired, GitCommandFailed, type GitOperation, GitOutputInvalid } from "#errors.ts";

const ProcessResult = Schema.Struct({
	exitCode: Schema.Natural,
	stderr: Schema.String,
	stdout: Schema.String,
});

interface ProcessOutput {
	readonly exitCode: number;
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

export const decodeProcessOutput = (operation: GitOperation, input: unknown): Effect.Effect<ProcessOutput, GitOutputInvalid> =>
	Schema.decodeUnknownEffect(ProcessResult)(input).pipe(
		Effect.mapError(
			(cause) =>
				new GitOutputInvalid({
					detail: String(cause),
					operation,
				}),
		),
	);

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
