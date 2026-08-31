import { Effect, Option, Schema } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import { runGh } from "#command.ts";
import { type GhError, GhOutputInvalid } from "#errors.ts";
import type { GitHubRepoName } from "#source.ts";

const FIND_TIMEOUT_MILLIS = 30_000;

const FoundPulls = Schema.Array(Schema.Struct({ number: Schema.Number }));

export const findPull = (
	executable: string,
	repo: GitHubRepoName,
	branch: string,
): Effect.Effect<Option.Option<number>, GhError, ChildProcessSpawner.ChildProcessSpawner> =>
	runGh({
		args: ["pr", "list", "--repo", `${repo.owner}/${repo.name}`, "--head", branch, "--state", "open", "--limit", "1", "--json", "number"],
		executable,
		operation: "find-change",
		timeoutMillis: FIND_TIMEOUT_MILLIS,
	}).pipe(
		Effect.flatMap((stdout) =>
			Schema.decodeUnknownEffect(Schema.fromJsonString(FoundPulls))(stdout).pipe(
				Effect.mapError(
					(cause) =>
						new GhOutputInvalid({
							detail: String(cause),
							operation: "find-change",
						}),
				),
			),
		),
		Effect.map((found) => Option.map(Option.fromUndefinedOr(found[0]), (pull) => pull.number)),
	);
