import { type ChangeHost, type ChangeHostError, ChangeHostRefused } from "@antumbra/platform-change-host/port.ts";
import type { HostRepo } from "@antumbra/platform-vocabulary/change-host.ts";
import { GitHub } from "@shivaedev/github/GitHub.ts";
import { Effect, Option } from "effect";
import { type CachedCapability, makeCachedCapability } from "#capability.ts";
import type { GhError } from "#errors.ts";
import { observeOne } from "#observe.ts";
import { observePulls, pullRefsOf } from "#observe-pass.ts";
import { createPull } from "#open.ts";
import { GhProcess } from "#process.ts";
import { type PullRequestRef, parsePullUrl } from "#pull-url.ts";
import { GITHUB_TAG, toHostError } from "#runtime.ts";
import { type GitHubRepoName, parseGitHubSource, sameRepo } from "#source.ts";

export const GH_EXECUTABLE = "gh";

export interface GitHubHostOptions {
	readonly executable: string;
	readonly hostname?: string;
}

const refused = (detail: string): ChangeHostError => new ChangeHostRefused({ detail, host: GITHUB_TAG });

const namedRepo = (repo: HostRepo, hostname: string): Effect.Effect<GitHubRepoName, ChangeHostError> =>
	Option.match(parseGitHubSource(repo.source, hostname), {
		onNone: () => refused(`${repo.name} is not a GitHub repository (${repo.source})`),
		onSome: Effect.succeed,
	});

const matchingPull = (named: GitHubRepoName, url: string, hostname: string): Effect.Effect<PullRequestRef, ChangeHostError> =>
	Option.match(parsePullUrl(url, hostname), {
		onNone: () => refused(`${url} is not a GitHub pull request address`),
		onSome: (pull) =>
			sameRepo(named, pull) ? Effect.succeed(pull) : refused(`${url} belongs to ${pull.owner}/${pull.name}, not ${named.owner}/${named.name}`),
	});

// A rejected login invalidates the cached capability immediately.
const throughGh =
	(cached: CachedCapability) =>
	<A>(program: Effect.Effect<A, GhError>): Effect.Effect<A, ChangeHostError> =>
		program.pipe(
			Effect.tapError((failure) => (failure._tag === "GhAuthRequired" ? cached.forget : Effect.void)),
			Effect.mapError(toHostError),
		);

export const makeGitHubHost = (options: GitHubHostOptions): Effect.Effect<ChangeHost, never, GhProcess | typeof GitHub.Identifier> =>
	Effect.gen(function* () {
		const process = yield* GhProcess;
		const github = yield* GitHub;
		const hostname = options.hostname ?? "github.com";
		const cached = yield* makeCachedCapability(options.executable, hostname);
		const asked = <A>(program: Effect.Effect<A, GhError, GhProcess | typeof GitHub.Identifier>) =>
			throughGh(cached)(program.pipe(Effect.provideService(GhProcess, process), Effect.provideService(GitHub, github)));
		return {
			adopt: (url, repo) =>
				Effect.gen(function* () {
					const named = yield* namedRepo(repo, hostname);
					const pull = yield* matchingPull(named, url, hostname);
					return yield* asked(observeOne(named, repo.id, pull.number));
				}),
			capability: cached.read.pipe(Effect.provideService(GhProcess, process)),
			observe: (refs) => asked(observePulls(pullRefsOf(refs, hostname))),
			open: (request) =>
				Effect.gen(function* () {
					const named = yield* namedRepo(request.repo, hostname);
					const number = yield* asked(createPull(options.executable, named, request, hostname));
					return yield* asked(observeOne(named, request.repo.id, number));
				}),
			supports: (repo) => Option.isSome(parseGitHubSource(repo.source, hostname)),
			tag: GITHUB_TAG,
		} satisfies ChangeHost;
	});
