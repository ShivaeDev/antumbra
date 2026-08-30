import type { ChangeObservation } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { runGh } from "#command.ts";
import { type GhCommandFailed, type GhError, GhOutputInvalid } from "#errors.ts";
import { mapPullRequest } from "#mapping.ts";
import { decodeObserveResponse } from "#payload.ts";
import { buildObservePlan, type LocatedPullRequestRef } from "#query.ts";
import { onThisMachine } from "#runtime.ts";
import type { GitHubRepoName } from "#source.ts";

const OBSERVE_TIMEOUT_MILLIS = 60_000;

// GitHub can return a partial GraphQL response with a failing exit code.
const partial = (failure: GhCommandFailed): Effect.Effect<string, GhError> =>
	failure.stdout.trim() === ""
		? Effect.fail(failure)
		: Effect.logDebug("github answered part of a change batch", {
				detail: failure.detail,
			}).pipe(Effect.as(failure.stdout));

export const observeGroup = (
	executable: string,
	group: ReadonlyArray<LocatedPullRequestRef>,
): Effect.Effect<ReadonlyArray<ChangeObservation>, GhError> =>
	Effect.gen(function* () {
		const plan = buildObservePlan(group);
		const stdout = yield* onThisMachine(
			runGh({
				args: ["api", "graphql", "-f", `query=${plan.query}`],
				executable,
				operation: "observe-changes",
				timeoutMillis: OBSERVE_TIMEOUT_MILLIS,
			}),
		).pipe(Effect.catchTag("GhCommandFailed", partial));
		return yield* Effect.forEach(yield* decodeObserveResponse("observe-changes", stdout, plan.selections), mapPullRequest);
	});

export const observeOne = (executable: string, repo: GitHubRepoName, repoId: string, number: number): Effect.Effect<ChangeObservation, GhError> =>
	observeGroup(executable, [{ ...repo, number, repoId }]).pipe(
		Effect.flatMap((seen) => {
			const one = seen[0];
			return one === undefined
				? Effect.fail(
						new GhOutputInvalid({
							detail: `pull request ${number} in ${repo.owner}/${repo.name} could not be read back`,
							operation: "observe-changes",
						}),
					)
				: Effect.succeed(one);
		}),
	);
