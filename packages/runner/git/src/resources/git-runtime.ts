import { Effect } from "effect";
import type { GitError } from "#errors.ts";
import type { GitProcess } from "#process.ts";
import { RunnerAuthRequired, type RunnerError, RunnerFailure } from "#resources/model.ts";

export const toRunnerError = (failure: GitError): RunnerError => {
	if (failure._tag === "GitAuthRequired") {
		return new RunnerAuthRequired({
			detail: failure.detail,
			tag: "local",
		});
	}
	return new RunnerFailure({
		detail: `${failure.operation}: ${failure.detail}`,
		tag: "local",
	});
};

export const runGit = <A>(program: Effect.Effect<A, GitError, GitProcess>): Effect.Effect<A, RunnerError, GitProcess> =>
	program.pipe(Effect.mapError(toRunnerError));
