import type { ChangeObservation, ChangeRef } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import { runGh } from "#command.ts";
import {
	type GhCommandFailed,
	type GhError,
	GhOutputInvalid,
} from "#errors.ts";
import { mapPullRequest } from "#mapping.ts";
import { decodeObserveResponse } from "#payload.ts";
import {
	buildObservePlan,
	chunked,
	type LocatedPullRequestRef,
	OBSERVE_CHUNK_SIZE,
} from "#query.ts";
import { onThisMachine } from "#runtime.ts";
import { type GitHubRepoName, parseGitHubSource } from "#source.ts";

const OBSERVE_TIMEOUT_MILLIS = 60_000;

// why: only what this host can address is asked about — a change on another
// forge, or one whose external id is not a pull request number, belongs to
// someone else and is left untouched rather than guessed at.
export const pullRefsOf = (
	refs: ReadonlyArray<ChangeRef>,
): ReadonlyArray<LocatedPullRequestRef> =>
	refs.flatMap((ref) => {
		const repo = parseGitHubSource(ref.repo.source);
		const number = Number(ref.externalId);
		return Option.isNone(repo) || !Number.isSafeInteger(number) || number <= 0
			? []
			: [
					{
						name: repo.value.name,
						number,
						owner: repo.value.owner,
						repoId: ref.repo.id,
					},
				];
	});

// why: GitHub answers a batch partially — one pull request this login cannot
// see makes gh exit nonzero while every other node is still in the payload.
// The answer is kept and the complaint goes to the log.
const partial = (failure: GhCommandFailed): Effect.Effect<string, GhError> =>
	failure.stdout.trim() === ""
		? Effect.fail(failure)
		: Effect.logWarning("github answered part of a change batch", {
				detail: failure.detail,
			}).pipe(Effect.as(failure.stdout));

const observeGroup = (
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
		return yield* Effect.forEach(
			yield* decodeObserveResponse("observe-changes", stdout, plan.selections),
			mapPullRequest,
		);
	});

// why: a chunk that fails leaves its rows unobserved, and the domain reads an
// unobserved row as untouched — the rest of the fleet still gets its answer.
// A login that does not work is different: nothing in this pass can succeed,
// so it fails the whole call rather than reporting silence as calm.
const observedOrSkipped = (
	executable: string,
	group: ReadonlyArray<LocatedPullRequestRef>,
): Effect.Effect<ReadonlyArray<ChangeObservation>, GhError> =>
	observeGroup(executable, group).pipe(
		Effect.catch(
			(failure): Effect.Effect<ReadonlyArray<ChangeObservation>, GhError> =>
				failure._tag === "GhAuthRequired"
					? Effect.fail(failure)
					: Effect.logWarning("a batch of changes went unobserved", {
							detail: failure.message,
						}).pipe(Effect.as([])),
		),
	);

export const observePulls = (
	executable: string,
	refs: ReadonlyArray<LocatedPullRequestRef>,
): Effect.Effect<ReadonlyArray<ChangeObservation>, GhError> =>
	refs.length === 0
		? Effect.succeed([])
		: Effect.forEach(chunked(refs, OBSERVE_CHUNK_SIZE), (group) =>
				observedOrSkipped(executable, group),
			).pipe(Effect.map((groups) => groups.flat()));

// why: opening and adopting both end by reading the change back, so what they
// return is an observation and not a promise that one exists. A pull request
// that answers nothing right after it was named is the host disagreeing with
// itself, which is unavailability rather than a refusal.
export const observeOne = (
	executable: string,
	repo: GitHubRepoName,
	repoId: string,
	number: number,
): Effect.Effect<ChangeObservation, GhError> =>
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
