import { pushBranch } from "@antumbra/git";
import type { ChangeHostBerth, ChangeHostError, OpenChangeRequest } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import { runGh } from "#command.ts";
import { type GhError, GhOutputInvalid } from "#errors.ts";
import { findPull } from "#find-pull.ts";
import { parsePullUrl } from "#pull-url.ts";
import { onThisMachine, toPushRefusal } from "#runtime.ts";
import type { GitHubRepoName } from "#source.ts";

const CREATE_TIMEOUT_MILLIS = 120_000;

const slug = (repo: GitHubRepoName): string => `${repo.owner}/${repo.name}`;

// why: title and body travel as ordinary arguments because gh is spawned
// directly, with no shell between us and it — a multi-line body needs no
// quoting and no temp file dropped into the agent's berth.
const createArgs = (repo: GitHubRepoName, request: OpenChangeRequest): ReadonlyArray<string> => [
	"pr",
	"create",
	"--repo",
	slug(repo),
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

const createMissingPull = (executable: string, repo: GitHubRepoName, request: OpenChangeRequest) =>
	runGh({
		args: createArgs(repo, request),
		cwd: request.berth.path,
		executable,
		operation: "create-change",
		timeoutMillis: CREATE_TIMEOUT_MILLIS,
	}).pipe(Effect.flatMap(createdNumber));

export const createPull = (executable: string, repo: GitHubRepoName, request: OpenChangeRequest): Effect.Effect<number, GhError> =>
	onThisMachine(
		findPull(executable, repo, request.berth.branch).pipe(
			Effect.flatMap(
				Option.match({
					onNone: () => createMissingPull(executable, repo, request),
					onSome: Effect.succeed,
				}),
			),
		),
	);

export const pushWorkBranch = (berth: ChangeHostBerth, preparedHeadSha: string): Effect.Effect<void, ChangeHostError> =>
	onThisMachine(pushBranch(berth.path, berth.branch, preparedHeadSha)).pipe(Effect.mapError(toPushRefusal));
