import type { Observation } from "@antumbra/platform-vocabulary/change-host.ts";
import { Effect } from "effect";
import { GitHub } from "@shivaedev/github/github/service.ts";
import { clientError } from "#client-error.ts";
import { type GhError, GhOutputInvalid, GhUnavailable } from "#errors.ts";
import { mapPullRequest } from "#mapping.ts";
import { decodeObserveResponse } from "#payload.ts";
import { buildObservePlan, type LocatedPullRequestRef } from "#query.ts";
import type { GitHubRepoName } from "#source.ts";

export const observeGroup = Effect.fn("GitHub.observeGroup")(function* (group: ReadonlyArray<LocatedPullRequestRef>) {
	const plan = buildObservePlan(group);
	const github = yield* GitHub;
	const response = yield* github.graphql(plan.query, {}, { responseByteLimit: 16 * 1024 * 1024 }).pipe(
		Effect.mapError(clientError("observe-changes")),
		Effect.timeoutOrElse({
			duration: 60_000,
			orElse: () => Effect.fail(new GhUnavailable({ operation: "observe-changes", detail: "GitHub observation exceeded its deadline of 60000ms" })),
		}),
	);
	return yield* Effect.forEach(yield* decodeObserveResponse("observe-changes", response.body, plan.selections), mapPullRequest);
});
export const observeOne = (repo: GitHubRepoName, repoId: string, number: number): Effect.Effect<Observation, GhError, typeof GitHub.Identifier> =>
	observeGroup([{ ...repo, number, repoId }]).pipe(
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
