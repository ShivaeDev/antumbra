import { Effect, Result } from "effect";
import { keyOf } from "#pr/command.ts";
import { complaint, type Failing, failingFrom, noticed } from "#pr/failing.ts";
import { admit, type Fleet, type Watched } from "#pr/fleet.ts";
import { type Event, labelled } from "#pr/lines.ts";
import type { Reading } from "#pr/observation.ts";
import type { Get, Outcome } from "#pr/pages.ts";
import { type Step, step } from "#pr/program.ts";
import { openFrom, pullFrom } from "#pr/pull.ts";
import { type Etags, keptEtags, recorder } from "#pr/recorder.ts";
import { checks, issueComments, openPulls, pull, reviewComments, reviews, statuses } from "#pr/resources.ts";

export type Round = { readonly events: readonly Event[]; readonly exit: number | undefined; readonly fleet: Fleet };

const concurrency = 4;

const listing = (outcome: Outcome): { readonly error: string | undefined; readonly numbers: readonly number[] | undefined } => {
	if (outcome.kind === "same") return { error: undefined, numbers: undefined };
	if (outcome.kind === "failed") return { error: outcome.message, numbers: undefined };
	return Result.match(openFrom(outcome.pages), {
		onFailure: (error) => ({ error, numbers: undefined }),
		onSuccess: (numbers) => ({ error: undefined, numbers }),
	});
};

const headOf = (outcome: Outcome): string | undefined =>
	outcome.kind === "pages" ? Result.getOrUndefined(Result.map(pullFrom(outcome.pages), (read) => read.head)) : undefined;

const poll = (get: Get, fleet: Fleet, watched: Watched, now: number) =>
	Effect.gen(function* () {
		const { target, watch } = watched;
		const known = watch.pieces.pull === undefined ? new Map() : fleet.etags;
		const recorded = recorder(get, known);
		const read = recorded.read;
		const pulled = yield* read(pull(target));
		const head = headOf(pulled) ?? watch.pieces.pull?.head;
		const reading: Reading = {
			checks: head === undefined ? undefined : { head, outcome: yield* read(checks(target, head)) },
			comments: yield* read(issueComments(target)),
			inline: yield* read(reviewComments(target)),
			pull: pulled,
			reviews: yield* read(reviews(target)),
			statuses: head === undefined ? undefined : { head, outcome: yield* read(statuses(target, head)) },
		};
		const progress = step(watch, fleet.until, now, reading);
		return { etags: keptEtags(recorded, known, progress.watch.failing !== undefined), progress };
	});

type Surveyed = {
	readonly cannot: boolean;
	readonly events: readonly Event[];
	readonly failing: Failing | undefined;
	readonly etags: Etags;
	readonly numbers: readonly number[];
	readonly repo: string;
};

const survey = (get: Get, fleet: Fleet, repo: string, previous: Failing | undefined, now: number): Effect.Effect<Surveyed> => {
	const recorded = recorder(get, fleet.etags);
	return Effect.map(recorded.read(openPulls(repo)), (outcome) => {
		const { error, numbers = [] } = listing(outcome);
		const failing = failingFrom(previous, error, now);
		const etags = keptEtags(recorded, fleet.etags, error !== undefined);
		if (fleet.rounds === 0 && failing !== undefined) {
			return { cannot: true, etags, events: [labelled({ repo }, complaint(failing, now))], failing, numbers, repo };
		}
		const notice = noticed(failing, now);
		return { cannot: false, etags, events: notice.lines.map((line) => labelled({ repo }, line)), failing: notice.failing, numbers, repo };
	});
};

type Settled = { readonly cannot: boolean; readonly etags: Etags; readonly events: readonly Event[]; readonly watched: Watched };

const settle = (fleet: Fleet, watched: Watched, progress: Step, etags: Etags, now: number): Settled => {
	const failing = progress.watch.failing;
	const cannot = fleet.rounds === 0 && watched.explicit && progress.watch.pieces.pull === undefined && failing !== undefined;
	const lines = cannot ? [complaint(failing, now)] : progress.lines;
	return {
		cannot,
		etags,
		events: lines.map((line) => labelled(watched.target, line)),
		watched: { ...watched, exit: cannot ? 2 : progress.exit, watch: progress.watch },
	};
};

const exitOf = (fleet: Fleet, cannot: boolean, pulls: readonly Watched[]): number | undefined => {
	if (cannot) return 2;
	if (fleet.repos.size > 0 || pulls.some((watched) => watched.exit === undefined)) return undefined;
	return Math.max(0, ...pulls.map((watched) => watched.exit ?? 0));
};

const tend = (get: Get, fleet: Fleet, watched: Watched, now: number): Effect.Effect<Settled> =>
	watched.exit === undefined
		? Effect.map(poll(get, fleet, watched, now), (polled) => settle(fleet, watched, polled.progress, polled.etags, now))
		: Effect.succeed({ cannot: false, etags: new Map(), events: [], watched });

export const round = (get: Get, fleet: Fleet, now: number): Effect.Effect<Round> =>
	Effect.gen(function* () {
		const surveyed = yield* Effect.forEach([...fleet.repos], ([repo, failing]) => survey(get, fleet, repo, failing, now));
		const joined = surveyed.reduce((pulls, seen) => admit({ ...fleet, pulls }, seen.repo, seen.numbers), fleet.pulls);
		const settled = yield* Effect.forEach([...joined.values()], (watched) => tend(get, fleet, watched, now), { concurrency });
		const pulls = settled.map((entry) => entry.watched);
		const cannot = [...surveyed, ...settled].some((entry) => entry.cannot);
		return {
			events: [...surveyed.flatMap((entry) => entry.events), ...settled.flatMap((entry) => entry.events)],
			exit: exitOf(fleet, cannot, pulls),
			fleet: {
				...fleet,
				etags: new Map([...surveyed, ...settled].flatMap((entry) => [...entry.etags])),
				pulls: new Map(pulls.map((watched) => [keyOf(watched.target), watched])),
				repos: new Map(surveyed.map((entry) => [entry.repo, entry.failing])),
				rounds: fleet.rounds + 1,
			},
		};
	});
