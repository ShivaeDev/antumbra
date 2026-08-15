import { pushBranch } from "@antumbra/git";
import type {
	ChangeHostBerth,
	ChangeHostError,
	OpenChangeRequest,
} from "@antumbra/plugin-api";
import { Effect, Option, Schema } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import { runGh } from "#command.ts";
import { type GhError, GhOutputInvalid } from "#errors.ts";
import { parsePullUrl } from "#pull-url.ts";
import { onThisMachine, toPushRefusal } from "#runtime.ts";
import type { GitHubRepoName } from "#source.ts";

const CREATE_TIMEOUT_MILLIS = 120_000;
const FIND_TIMEOUT_MILLIS = 30_000;
const ALREADY_EXISTS = "already exists";

const FoundPull = Schema.Struct({ number: Schema.Number });

const slug = (repo: GitHubRepoName): string => `${repo.owner}/${repo.name}`;

// why: title and body travel as ordinary arguments because gh is spawned
// directly, with no shell between us and it — a multi-line body needs no
// quoting and no temp file dropped into the agent's berth.
const createArgs = (
	repo: GitHubRepoName,
	request: OpenChangeRequest,
): ReadonlyArray<string> => [
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

const urlNumber = (stdout: string): Option.Option<number> => {
	const line =
		stdout
			.split("\n")
			.map((text) => text.trim())
			.filter((text) => text !== "")
			.at(-1) ?? "";
	return Option.map(parsePullUrl(line), (ref) => ref.number);
};

// why: opening twice must not fail the second time. A branch that already has
// a pull request is the same answer arriving late — an agent that retried, or
// a berth reopened after a restart — so the existing one is looked up and
// observed rather than reported as a refusal.
const findPull = (
	executable: string,
	repo: GitHubRepoName,
	branch: string,
): Effect.Effect<number, GhError, ChildProcessSpawner.ChildProcessSpawner> =>
	runGh({
		args: ["pr", "view", branch, "--repo", slug(repo), "--json", "number"],
		executable,
		operation: "find-change",
		timeoutMillis: FIND_TIMEOUT_MILLIS,
	}).pipe(
		Effect.flatMap((stdout) =>
			Schema.decodeUnknownEffect(Schema.fromJsonString(FoundPull))(stdout).pipe(
				Effect.mapError(
					(cause) =>
						new GhOutputInvalid({
							detail: String(cause),
							operation: "find-change",
						}),
				),
			),
		),
		Effect.map((found) => found.number),
	);

const alreadyOpen = (
	failure: GhError,
): Effect.Effect<Option.Option<number>, GhError> =>
	failure._tag === "GhCommandFailed" &&
	failure.detail.toLowerCase().includes(ALREADY_EXISTS)
		? Effect.succeed(Option.none())
		: Effect.fail(failure);

export const createPull = (
	executable: string,
	repo: GitHubRepoName,
	request: OpenChangeRequest,
): Effect.Effect<number, GhError> =>
	onThisMachine(
		runGh({
			args: createArgs(repo, request),
			cwd: request.berth.path,
			executable,
			operation: "create-change",
			timeoutMillis: CREATE_TIMEOUT_MILLIS,
		}).pipe(
			Effect.map(urlNumber),
			Effect.catch(alreadyOpen),
			Effect.flatMap(
				Option.match({
					onNone: () => findPull(executable, repo, request.berth.branch),
					onSome: Effect.succeed,
				}),
			),
		),
	);

export const pushWorkBranch = (
	berth: ChangeHostBerth,
): Effect.Effect<void, ChangeHostError> =>
	onThisMachine(pushBranch(berth.path, berth.branch)).pipe(
		Effect.mapError(toPushRefusal),
	);
