import type { OpenRequest } from "@antumbra/platform-vocabulary/change-host.ts";
import type { GitHub } from "@shivaedev/github/GitHub.ts";
import { Effect, Option } from "effect";
import { runGh } from "#command.ts";
import { type GhError, GhOutputInvalid } from "#errors.ts";
import { findPull } from "#find-pull.ts";
import type { GhProcess } from "#process.ts";
import { parsePullUrl } from "#pull-url.ts";
import type { GitHubRepoName } from "#source.ts";

const CREATE_TIMEOUT_MILLIS = 120_000;

// gh is spawned without a shell, so title and body are ordinary arguments.
const createArgs = (repo: GitHubRepoName, request: OpenRequest, hostname: string): ReadonlyArray<string> => [
	"pr",
	"create",
	"--repo",
	`${hostname}/${repo.owner}/${repo.name}`,
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

const createdNumber = (stdout: string, hostname: string) => {
	const line =
		stdout
			.split("\n")
			.map((text) => text.trim())
			.filter((text) => text !== "")
			.at(-1) ?? "";
	return Option.match(parsePullUrl(line, hostname), {
		onNone: () =>
			new GhOutputInvalid({
				detail: "gh pr create returned no pull request URL",
				operation: "create-change",
			}),
		onSome: (ref) => Effect.succeed(ref.number),
	});
};

const createMissingPull = (executable: string, repo: GitHubRepoName, request: OpenRequest, hostname: string) =>
	runGh({
		args: createArgs(repo, request, hostname),
		executable,
		operation: "create-change",
		timeoutMillis: CREATE_TIMEOUT_MILLIS,
	}).pipe(Effect.flatMap((stdout) => createdNumber(stdout, hostname)));

export const createPull = (
	executable: string,
	repo: GitHubRepoName,
	request: OpenRequest,
	hostname = "github.com",
): Effect.Effect<number, GhError, GhProcess | typeof GitHub.Identifier> =>
	findPull(repo, request).pipe(
		Effect.flatMap(Option.match({ onNone: () => createMissingPull(executable, repo, request, hostname), onSome: Effect.succeed })),
	);
