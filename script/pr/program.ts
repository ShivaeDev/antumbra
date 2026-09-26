import type { Until } from "#pr/command.ts";
import { type Failing, failingFrom, noticed } from "#pr/failing.ts";
import type { Line } from "#pr/lines.ts";
import type { Note } from "#pr/notes.ts";
import { absorb, nothing, type Observation, observationFrom, type Pieces, type Reading } from "#pr/observation.ts";
import type { Lifecycle, Merge } from "#pr/pull.ts";

export const emptyLimit = 300_000;

type Settled = { readonly ci: "failed" | "green"; readonly head: string };

export type Watch = {
	readonly armed: string | undefined;
	readonly backlog: boolean;
	readonly changesRequested: boolean;
	readonly emptySince: number | undefined;
	readonly failing: Failing | undefined;
	readonly head: string | undefined;
	readonly lifecycle: Lifecycle;
	readonly merge: Merge | undefined;
	readonly pieces: Pieces;
	readonly seen: ReadonlySet<string>;
	readonly settled: Settled | undefined;
};

export type Step = { readonly exit: number | undefined; readonly lines: readonly Line[]; readonly watch: Watch };

export const initial: Watch = {
	armed: undefined,
	backlog: true,
	changesRequested: false,
	emptySince: undefined,
	failing: undefined,
	head: undefined,
	lifecycle: "open",
	merge: undefined,
	pieces: nothing,
	seen: new Set(),
	settled: undefined,
};

type End = "ci-failed" | "ci-green" | "ended" | "no-checks" | "superseded";

const exits = { "ci-failed": 1, "ci-green": 0, "no-checks": 0, superseded: 4 } as const;

const exitFor = (until: Until, end: End): number => {
	if (end === "ended") return until === "ci" ? 3 : 0;
	return exits[end];
};

export const noteKey = (note: Note): string => `${note.state}:${note.id}`;

const emptySinceFor = (watch: Watch, now: number, observation: Observation): number | undefined => {
	if (observation.ci !== "none") return undefined;
	return watch.head === observation.head ? (watch.emptySince ?? now) : now;
};

const endFor = (until: Until, observation: Observation, armed: string, expired: boolean): End | undefined => {
	if (until === "end") return observation.lifecycle === "open" ? undefined : "ended";
	if (observation.lifecycle !== "open") return "ended";
	if (observation.head !== armed) return "superseded";
	if (observation.ci === "green") return "ci-green";
	if (observation.ci === "failed") return "ci-failed";
	return expired ? "no-checks" : undefined;
};

const failure = (observation: Observation): Line => ({ state: "ci-failed", head: observation.head, ...observation.failed });

const settling = (
	watch: Watch,
	until: Until,
	observation: Observation,
): { readonly lines: readonly Line[]; readonly settled: Settled | undefined } => {
	const ci = observation.ci;
	if (ci !== "failed" && ci !== "green") return { lines: [], settled: watch.settled };
	if (watch.settled?.ci === ci && watch.settled.head === observation.head) return { lines: [], settled: watch.settled };
	const line: Line = ci === "green" ? { state: "ci-green", head: observation.head } : failure(observation);
	return { lines: until === "end" ? [line] : [], settled: { ci, head: observation.head } };
};

const merging = (previous: Merge | undefined, next: Merge | undefined, head: string): readonly Line[] => {
	if (next === undefined || next === previous) return [];
	if (next !== "clean") return [{ state: next, head }];
	return previous === undefined ? [] : [{ state: "mergeable", head }];
};

const ended = (until: Until, watch: Watch, observation: Observation): readonly Line[] => {
	if (observation.lifecycle === "open") return [];
	if (until === "end" && observation.lifecycle === watch.lifecycle) return [];
	return [{ state: observation.lifecycle, head: observation.head }];
};

const verdict = (until: Until, end: End | undefined, observation: Observation): readonly Line[] => {
	if (until === "end" || end === undefined || end === "ended") return [];
	return [end === "ci-failed" ? failure(observation) : { state: end, head: observation.head }];
};

const advance = (watch: Watch, until: Until, now: number, observation: Observation, pieces: Pieces, failing: Failing | undefined): Step => {
	const armed = watch.armed ?? observation.head;
	const merge = observation.merge ?? watch.merge;
	const emptySince = emptySinceFor(watch, now, observation);
	const end = endFor(until, observation, armed, emptySince !== undefined && now - emptySince >= emptyLimit);
	const fresh = observation.notes.filter((note) => !watch.seen.has(noteKey(note)));
	const ci = settling(watch, until, observation);
	return {
		exit: end === undefined ? undefined : exitFor(until, end),
		lines: [
			...(watch.backlog ? [] : fresh),
			...ci.lines,
			...merging(watch.merge, merge, observation.head),
			...(observation.changesRequested && !watch.changesRequested ? [{ state: "changes-requested" as const, head: observation.head }] : []),
			...ended(until, watch, observation),
			...verdict(until, end, observation),
		],
		watch: {
			armed,
			backlog: watch.backlog && failing !== undefined,
			changesRequested: observation.changesRequested,
			emptySince,
			failing,
			head: observation.head,
			lifecycle: observation.lifecycle,
			merge,
			pieces,
			seen: new Set([...watch.seen, ...fresh.map(noteKey)]),
			settled: ci.settled,
		},
	};
};

export const step = (watch: Watch, until: Until, now: number, reading: Reading): Step => {
	const absorbed = absorb(watch.pieces, reading);
	const complaint = noticed(failingFrom(watch.failing, absorbed.error, now), now);
	const observation = observationFrom(absorbed.pieces);
	if (observation === undefined)
		return { exit: undefined, lines: complaint.lines, watch: { ...watch, failing: complaint.failing, pieces: absorbed.pieces } };
	const progress = advance(watch, until, now, observation, absorbed.pieces, complaint.failing);
	return { ...progress, lines: [...complaint.lines, ...progress.lines] };
};
