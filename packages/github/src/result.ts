import { Effect, Schema } from "effect";
import { GhAuthRequired, GhCommandFailed, type GhOperation, GhOutputInvalid, GhUnavailable } from "#errors.ts";

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
	exitCode === AUTH_EXIT_CODE || authMarkers.some((marker) => detail.toLowerCase().includes(marker));

// why: a gateway that fell over or a socket that died is not this login being
// told no. gh ran perfectly and still came back with nothing anybody can act
// on, so it is read as an unreachable host — the one failure where asking the
// same question again in a while is the whole remedy.
const SERVER_STATUS = /\bhttp 5\d\d\b/;

const outageMarkers = [
	"bad gateway",
	"connection reset",
	"gateway time-out",
	"gateway timeout",
	"i/o timeout",
	"no such host",
	"service unavailable",
] as const;

const wentUnreachable = (detail: string): boolean => {
	const said = detail.toLowerCase();
	return SERVER_STATUS.test(said) || outageMarkers.some((marker) => said.includes(marker));
};

export const decodeProcessOutput = (operation: GhOperation, input: unknown): Effect.Effect<ProcessOutput, GhOutputInvalid> =>
	Schema.decodeUnknownEffect(ProcessResult)(input).pipe(Effect.mapError((cause) => new GhOutputInvalid({ detail: String(cause), operation })));

export const acceptProcessOutput = (
	operation: GhOperation,
	output: ProcessOutput,
): Effect.Effect<string, GhAuthRequired | GhCommandFailed | GhUnavailable> => {
	if (output.exitCode === 0) {
		return Effect.succeed(output.stdout);
	}
	const detail = output.stderr.trim() || output.stdout.trim() || `gh exited with code ${output.exitCode}`;
	if (needsAuthentication(output.exitCode, detail)) {
		return Effect.fail(new GhAuthRequired({ detail, operation }));
	}
	if (wentUnreachable(detail)) {
		return Effect.fail(new GhUnavailable({ detail, operation }));
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
