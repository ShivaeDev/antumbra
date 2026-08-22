import type { ChangeObservation, ChangeRef } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import type { GhError } from "#errors.ts";
import { observeGroup } from "#observe.ts";
import {
	chunked,
	type LocatedPullRequestRef,
	OBSERVE_CHUNK_SIZE,
} from "#query.ts";
import { parseGitHubSource } from "#source.ts";

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

interface GroupAnswer {
	readonly seen: ReadonlyArray<ChangeObservation>;
	readonly unheard: GhError | null;
}

// why: a chunk that fails leaves its rows unobserved, and the domain reads an
// unobserved row as untouched — the rest of the fleet still gets its answer.
// A login that does not work is different: nothing in this pass can succeed,
// so it fails the whole call rather than reporting silence as calm.
const observedOrSkipped = (
	executable: string,
	group: ReadonlyArray<LocatedPullRequestRef>,
): Effect.Effect<GroupAnswer, GhError> =>
	observeGroup(executable, group).pipe(
		Effect.map((seen): GroupAnswer => ({ seen, unheard: null })),
		Effect.catch(
			(failure): Effect.Effect<GroupAnswer, GhError> =>
				failure._tag === "GhAuthRequired"
					? Effect.fail(failure)
					: Effect.succeed({ seen: [], unheard: failure }),
		),
	);

// why: an answer we could not read is a batch lost for as long as the payload
// keeps that shape; a host we could not reach is a pass that learned nothing
// and will learn something again the moment it comes back. Only the second is
// worth telling the watcher about, because only the second is worth waiting
// out — and only when nothing else answered either.
const outOfReach = (
	answers: ReadonlyArray<GroupAnswer>,
	unheard: ReadonlyArray<GhError>,
): GhError | undefined =>
	unheard.length === answers.length
		? unheard.find((failure) => failure._tag === "GhUnavailable")
		: undefined;

// why: silence is reported as silence rather than as calm — a watcher told
// the fleet has no news keeps asking at the pace of a fleet that has some.
// What was heard is still handed on, and what was not is one line at debug,
// because an outage repeats that line on every pass for as long as it lasts.
const gathered = (
	answers: ReadonlyArray<GroupAnswer>,
): Effect.Effect<ReadonlyArray<ChangeObservation>, GhError> => {
	const unheard = answers.flatMap((answer) =>
		answer.unheard === null ? [] : [answer.unheard],
	);
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
		: Effect.forEach(chunked(refs, OBSERVE_CHUNK_SIZE), (group) =>
				observedOrSkipped(executable, group),
			).pipe(Effect.flatMap(gathered));
