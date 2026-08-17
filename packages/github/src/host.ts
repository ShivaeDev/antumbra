import {
	type ChangeHost,
	type ChangeHostError,
	ChangeHostRefused,
	type ChangeHostRepo,
} from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import { type CachedCapability, makeCachedCapability } from "#capability.ts";
import type { GhError } from "#errors.ts";
import { observeOne, observePulls, pullRefsOf } from "#observe.ts";
import { createPull, pushWorkBranch } from "#open.ts";
import { type PullRequestRef, parsePullUrl } from "#pull-url.ts";
import { GITHUB_TAG, toHostError } from "#runtime.ts";
import { type GitHubRepoName, parseGitHubSource, sameRepo } from "#source.ts";

export const GH_EXECUTABLE = "gh";

export interface GitHubHostOptions {
	readonly executable: string;
}

const refused = (detail: string): ChangeHostError =>
	new ChangeHostRefused({ detail, host: GITHUB_TAG });

const namedRepo = (
	repo: ChangeHostRepo,
): Effect.Effect<GitHubRepoName, ChangeHostError> =>
	Option.match(parseGitHubSource(repo.source), {
		onNone: () =>
			refused(`${repo.name} is not a GitHub repository (${repo.source})`),
		onSome: Effect.succeed,
	});

// why: a link to somebody else's repository is refused rather than followed —
// adopting it would attach a piece of this voyage to a change no one here can
// see land.
const matchingPull = (
	named: GitHubRepoName,
	url: string,
): Effect.Effect<PullRequestRef, ChangeHostError> =>
	Option.match(parsePullUrl(url), {
		onNone: () => refused(`${url} is not a GitHub pull request address`),
		onSome: (pull) =>
			sameRepo(named, pull)
				? Effect.succeed(pull)
				: refused(
						`${url} belongs to ${pull.owner}/${pull.name}, not ${named.owner}/${named.name}`,
					),
	});

// why: a login that stopped working invalidates the cached answer on the spot,
// so the next tool call reports the truth instead of repeating a minute-old
// yes that the failure just disproved.
const throughGh =
	(cached: CachedCapability) =>
	<A>(program: Effect.Effect<A, GhError>): Effect.Effect<A, ChangeHostError> =>
		program.pipe(
			Effect.tapError((failure) =>
				failure._tag === "GhAuthRequired" ? cached.forget : Effect.void,
			),
			Effect.mapError(toHostError),
		);

export const makeGitHubHost = (
	options: GitHubHostOptions = { executable: GH_EXECUTABLE },
): Effect.Effect<ChangeHost> =>
	Effect.gen(function* () {
		const cached = yield* makeCachedCapability(options.executable);
		const asked = throughGh(cached);
		return {
			adopt: (url, repo) =>
				Effect.gen(function* () {
					const named = yield* namedRepo(repo);
					const pull = yield* matchingPull(named, url);
					return yield* asked(
						observeOne(options.executable, named, repo.id, pull.number),
					);
				}),
			capability: cached.read,
			observe: (refs) =>
				asked(observePulls(options.executable, pullRefsOf(refs))),
			open: (request) =>
				Effect.gen(function* () {
					const named = yield* namedRepo(request.repo);
					yield* pushWorkBranch(request.berth, request.headSha);
					const number = yield* asked(
						createPull(options.executable, named, request),
					);
					return yield* asked(
						observeOne(options.executable, named, request.repo.id, number),
					);
				}),
			supports: (repo) => Option.isSome(parseGitHubSource(repo.source)),
			tag: GITHUB_TAG,
		} satisfies ChangeHost;
	});
