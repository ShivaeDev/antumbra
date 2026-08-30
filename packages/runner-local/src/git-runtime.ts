import type { GitError } from "@antumbra/git";
import { RunnerAuthRequired, type RunnerError, RunnerFailure } from "@antumbra/plugin-api";
import { NodeServices } from "@effect/platform-node";
import { Effect } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";

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

export const runGit = <A>(program: Effect.Effect<A, GitError, ChildProcessSpawner.ChildProcessSpawner>): Effect.Effect<A, RunnerError> =>
	program.pipe(Effect.mapError(toRunnerError), Effect.provide(NodeServices.layer));
