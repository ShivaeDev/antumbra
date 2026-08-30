import type { ChangeObservation, ChangeRef } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import type { GhError } from "#errors.ts";
import { observeGroup } from "#observe.ts";
import { chunked, type LocatedPullRequestRef, OBSERVE_CHUNK_SIZE } from "#query.ts";
import { parseGitHubSource } from "#source.ts";

export const pullRefsOf = (refs: ReadonlyArray<ChangeRef>): ReadonlyArray<LocatedPullRequestRef> =>
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

interface GroupAnswer {
	readonly seen: ReadonlyArray<ChangeObservation>;
	readonly unheard: GhError | null;
}

// Authentication invalidates the pass; other failures leave one batch unobserved.
const observedOrSkipped = (executable: string, group: ReadonlyArray<LocatedPullRequestRef>): Effect.Effect<GroupAnswer, GhError> =>
	observeGroup(executable, group).pipe(
		Effect.map((seen): GroupAnswer => ({ seen, unheard: null })),
		Effect.catch(
			(failure): Effect.Effect<GroupAnswer, GhError> =>
				failure._tag === "GhAuthRequired" ? Effect.fail(failure) : Effect.succeed({ seen: [], unheard: failure }),
		),
	);

const outOfReach = (answers: ReadonlyArray<GroupAnswer>, unheard: ReadonlyArray<GhError>): GhError | undefined =>
	unheard.length === answers.length ? unheard.find((failure) => failure._tag === "GhUnavailable") : undefined;

const gathered = (answers: ReadonlyArray<GroupAnswer>): Effect.Effect<ReadonlyArray<ChangeObservation>, GhError> => {
	const unheard = answers.flatMap((answer) => (answer.unheard === null ? [] : [answer.unheard]));
	const silence = outOfReach(answers, unheard);
	if (silence !== undefined) {
		return Effect.fail(silence);
	}
	const seen = answers.flatMap((answer) => answer.seen);
	const first = unheard[0];
	return first === undefined
		? Effect.succeed(seen)
		: Effect.logDebug("a batch of changes went unobserved", {
				batches: unheard.length,
				detail: first.message,
			}).pipe(Effect.as(seen));
};

export const observePulls = (
	executable: string,
	refs: ReadonlyArray<LocatedPullRequestRef>,
): Effect.Effect<ReadonlyArray<ChangeObservation>, GhError> =>
	refs.length === 0
		? Effect.succeed([])
		: Effect.forEach(chunked(refs, OBSERVE_CHUNK_SIZE), (group) => observedOrSkipped(executable, group)).pipe(Effect.flatMap(gathered));
