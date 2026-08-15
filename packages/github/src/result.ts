import { Effect, Schema } from "effect";
import {
	GhAuthRequired,
	GhCommandFailed,
	type GhOperation,
	GhOutputInvalid,
} from "#errors.ts";

const ProcessResult = Schema.Struct({
	exitCode: Schema.Natural,
	stderr: Schema.String,
	stdout: Schema.String,
});

export interface ProcessOutput {
	readonly exitCode: number;
	readonly stderr: string;
	readonly stdout: string;
}

// why: gh reserves an exit code for an unusable login, and says so in prose on
// every path that does not use it. Both are read, because a caller that treats
// "you are logged out" as "the command failed" would tell an agent to retry
// something no retry can fix.
const AUTH_EXIT_CODE = 4;

const authMarkers = [
	"bad credentials",
	"gh auth login",
	"gh auth refresh",
	"http 401",
	"must authenticate",
	"not logged in",
	"requires authentication",
	"token has not been granted",
] as const;

const needsAuthentication = (exitCode: number, detail: string): boolean =>
	exitCode === AUTH_EXIT_CODE ||
	authMarkers.some((marker) => detail.toLowerCase().includes(marker));

export const decodeProcessOutput = (
	operation: GhOperation,
	input: unknown,
): Effect.Effect<ProcessOutput, GhOutputInvalid> =>
	Schema.decodeUnknownEffect(ProcessResult)(input).pipe(
		Effect.mapError(
			(cause) => new GhOutputInvalid({ detail: String(cause), operation }),
		),
	);

export const acceptProcessOutput = (
	operation: GhOperation,
	output: ProcessOutput,
): Effect.Effect<string, GhAuthRequired | GhCommandFailed> => {
	if (output.exitCode === 0) {
		return Effect.succeed(output.stdout);
	}
	const detail =
		output.stderr.trim() ||
		output.stdout.trim() ||
		`gh exited with code ${output.exitCode}`;
	if (needsAuthentication(output.exitCode, detail)) {
		return Effect.fail(new GhAuthRequired({ detail, operation }));
	}
	return Effect.fail(
		new GhCommandFailed({
			detail,
			exitCode: output.exitCode,
			operation,
			stdout: output.stdout,
		}),
	);
};
