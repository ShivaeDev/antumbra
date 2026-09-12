import type { OpenRequest } from "@antumbra/platform-change-host/schema.ts";
import { Effect, Option } from "effect";
import { runGh } from "#command.ts";
import { type GhError, GhOutputInvalid } from "#errors.ts";
import { findPull } from "#find-pull.ts";
import type { GhProcess } from "#process.ts";
import { parsePullUrl } from "#pull-url.ts";
import type { GitHubRepoName } from "#source.ts";

const CREATE_TIMEOUT_MILLIS = 120_000;

// gh is spawned without a shell, so title and body are ordinary arguments.
const createArgs = (repo: GitHubRepoName, request: OpenRequest): ReadonlyArray<string> => [
	"pr",
	"create",
	"--repo",
	`${repo.owner}/${repo.name}`,
	"--head",
	request.berth.branch,
	"--base",
	request.base ?? request.repo.defaultRef,
	"--title",
	request.title,
	"--body",
	request.body,
	...(request.draft ? ["--draft"] : []),
];

const createdNumber = (stdout: string) => {
	const line =
		stdout
			.split("\n")
			.map((text) => text.trim())
			.filter((text) => text !== "")
			.at(-1) ?? "";
	return Option.match(parsePullUrl(line), {
		onNone: () =>
			new GhOutputInvalid({
				detail: "gh pr create returned no pull request URL",
				operation: "create-change",
			}),
		onSome: (ref) => Effect.succeed(ref.number),
	});
};

const createMissingPull = (executable: string, repo: GitHubRepoName, request: OpenRequest) =>
	runGh({
		args: createArgs(repo, request),
		executable,
		operation: "create-change",
		timeoutMillis: CREATE_TIMEOUT_MILLIS,
	}).pipe(Effect.flatMap(createdNumber));

export const createPull = (executable: string, repo: GitHubRepoName, request: OpenRequest): Effect.Effect<number, GhError, GhProcess> =>
	findPull(executable, repo, request).pipe(
		Effect.flatMap(Option.match({ onNone: () => createMissingPull(executable, repo, request), onSome: Effect.succeed })),
	);
