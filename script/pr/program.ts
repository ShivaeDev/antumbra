import type { Until } from "#pr/command.ts";
import type { Note } from "#pr/notes.ts";
import { absorb, nothing, type Observation, observationFrom, type Pieces, type Reading } from "#pr/observation.ts";
import type { Lifecycle } from "#pr/pull.ts";

export const emptyLimit = 300_000;

export type Line =
	| { readonly state: "changes-requested" | "ci-green" | "closed" | "conflict" | "merged" | "no-checks" | "superseded"; readonly head: string }
	| { readonly state: "ci-failed"; readonly head: string; readonly checks: readonly string[] }
	| { readonly state: "gh-error"; readonly message: string }
	| Note;

export const render = (line: Line): string => JSON.stringify(line);

export type Watch = {
	readonly armed: string | undefined;
	readonly changesRequested: boolean;
	readonly conflict: boolean;
	readonly emptySince: number | undefined;
	readonly error: string | undefined;
	readonly failureReported: string | undefined;
	readonly head: string | undefined;
	readonly lifecycle: Lifecycle;
	readonly pieces: Pieces;
	readonly seen: ReadonlySet<string>;
};

export type Step = { readonly exit: number | undefined; readonly lines: readonly Line[]; readonly watch: Watch };

export const initial: Watch = {
	armed: undefined,
	changesRequested: false,
	conflict: false,
	emptySince: undefined,
	error: undefined,
	failureReported: undefined,
	head: undefined,
	lifecycle: "open",
	pieces: nothing,
	seen: new Set(),
};

type End = "ci-failed" | "ci-green" | "ended" | "no-checks" | "superseded";

const exits = { "ci-failed": 1, "ci-green": 0, "no-checks": 0, superseded: 4 } as const;

const exitFor = (until: Until, end: End): number => {
	if (end === "ended") return until === "ci" ? 3 : 0;
	return exits[end];
};

const key = (note: Note): string => `${note.state}:${note.id}`;

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

const ended = (watch: Watch, observation: Observation): readonly Line[] => {
	if (observation.lifecycle === "open" || observation.lifecycle === watch.lifecycle) return [];
	return [{ state: observation.lifecycle, head: observation.head }];
};

const verdict = (until: Until, end: End | undefined, observation: Observation): readonly Line[] => {
	if (until === "end" || end === undefined || end === "ci-failed" || end === "ended") return [];
	return [{ state: end, head: observation.head }];
};

const advance = (watch: Watch, until: Until, now: number, observation: Observation, pieces: Pieces, error: string | undefined): Step => {
	const armed = watch.armed ?? observation.head;
	const conflict = observation.conflict ?? watch.conflict;
	const failing = observation.ci === "failed" && watch.failureReported !== observation.head;
	const emptySince = emptySinceFor(watch, now, observation);
	const end = endFor(until, observation, armed, emptySince !== undefined && now - emptySince >= emptyLimit);
	const fresh = observation.notes.filter((note) => !watch.seen.has(key(note)));
	return {
		exit: end === undefined ? undefined : exitFor(until, end),
		lines: [
			...fresh,
			...(failing ? [{ state: "ci-failed" as const, head: observation.head, checks: observation.failed }] : []),
			...(conflict && !watch.conflict ? [{ state: "conflict" as const, head: observation.head }] : []),
			...(observation.changesRequested && !watch.changesRequested ? [{ state: "changes-requested" as const, head: observation.head }] : []),
			...ended(watch, observation),
			...verdict(until, end, observation),
		],
		watch: {
			armed,
			changesRequested: observation.changesRequested,
			conflict,
			emptySince,
			error,
			failureReported: failing ? observation.head : watch.failureReported,
			head: observation.head,
			lifecycle: observation.lifecycle,
			pieces,
			seen: new Set([...watch.seen, ...fresh.map(key)]),
		},
	};
};

export const step = (watch: Watch, until: Until, now: number, reading: Reading): Step => {
	const absorbed = absorb(watch.pieces, reading);
	const error = absorbed.error;
	const noticed: readonly Line[] = error !== undefined && error !== watch.error ? [{ state: "gh-error", message: error }] : [];
	const observation = observationFrom(absorbed.pieces);
	if (observation === undefined) return { exit: 2, lines: noticed, watch: { ...watch, error, pieces: absorbed.pieces } };
	const progress = advance(watch, until, now, observation, absorbed.pieces, error);
	return { ...progress, lines: [...noticed, ...progress.lines] };
};
