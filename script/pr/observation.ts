import { Result, Schema } from "effect";
import { Checks, type Ci, checksFrom, combined, statusesFrom } from "#pr/ci.ts";
import { commentsFrom, Inline, inlineFrom, Note, Reviews, reviewsFrom } from "#pr/notes.ts";
import type { Outcome } from "#pr/pages.ts";
import { type Lifecycle, type Merge, Pull, pullFrom } from "#pr/pull.ts";

type AtHead = { readonly head: string; readonly outcome: Outcome } | undefined;

export type Reading = {
	readonly checks: AtHead;
	readonly comments: Outcome;
	readonly inline: Outcome;
	readonly pull: Outcome;
	readonly reviews: Outcome;
	readonly statuses: AtHead;
};

export const Pieces = Schema.Struct({
	checks: Schema.optional(Checks),
	comments: Schema.Array(Note),
	inline: Schema.Array(Inline),
	pull: Schema.optional(Pull),
	reviews: Schema.optional(Reviews),
	statuses: Schema.optional(Checks),
});
export type Pieces = typeof Pieces.Type;

type Failed = { readonly checks: readonly string[]; readonly statuses: readonly string[] };

export type Observation = {
	readonly changesRequested: boolean;
	readonly ci: Ci;
	readonly failed: Failed;
	readonly head: string;
	readonly lifecycle: Lifecycle;
	readonly merge: Merge | undefined;
	readonly notes: readonly Note[];
};

export const nothing: Pieces = { checks: undefined, comments: [], inline: [], pull: undefined, reviews: undefined, statuses: undefined };

type Update<A> = { readonly error: string | undefined; readonly value: A };

const update = <A>(previous: A, outcome: Outcome | undefined, decode: (pages: readonly string[]) => Result.Result<A, string>): Update<A> => {
	if (outcome === undefined || outcome.kind === "same") return { error: undefined, value: previous };
	if (outcome.kind === "failed") return { error: outcome.message, value: previous };
	return Result.match(decode(outcome.pages), {
		onFailure: (message) => ({ error: message, value: previous }),
		onSuccess: (value) => ({ error: undefined, value }),
	});
};

const atHead = (previous: Checks | undefined, seen: AtHead, decode: (pages: readonly string[], head: string) => Result.Result<Checks, string>) =>
	update(previous, seen?.outcome, (pages) => decode(pages, seen?.head ?? ""));

export const absorb = (pieces: Pieces, reading: Reading): { readonly error: string | undefined; readonly pieces: Pieces } => {
	const pull = update<Pull | undefined>(pieces.pull, reading.pull, pullFrom);
	const checks = atHead(pieces.checks, reading.checks, checksFrom);
	const statuses = atHead(pieces.statuses, reading.statuses, statusesFrom);
	const reviews = update<Reviews | undefined>(pieces.reviews, reading.reviews, reviewsFrom);
	const inline = update<readonly Inline[]>(pieces.inline, reading.inline, inlineFrom);
	const comments = update<readonly Note[]>(pieces.comments, reading.comments, commentsFrom);
	return {
		error: pull.error ?? checks.error ?? statuses.error ?? reviews.error ?? inline.error ?? comments.error,
		pieces: {
			checks: checks.value,
			comments: comments.value,
			inline: inline.value,
			pull: pull.value,
			reviews: reviews.value,
			statuses: statuses.value,
		},
	};
};

const current = (checks: Checks | undefined, head: string): Checks | undefined => (checks?.head === head ? checks : undefined);

export const observationFrom = (pieces: Pieces): Observation | undefined => {
	const pull = pieces.pull;
	if (pull === undefined) return undefined;
	const pending = new Set(pieces.reviews?.pending ?? []);
	const checks = current(pieces.checks, pull.head);
	const statuses = current(pieces.statuses, pull.head);
	return {
		changesRequested: pieces.reviews?.changesRequested ?? false,
		ci: combined(checks?.ci ?? "none", statuses?.ci ?? "none"),
		failed: { checks: checks?.failed ?? [], statuses: statuses?.failed ?? [] },
		head: pull.head,
		lifecycle: pull.lifecycle,
		merge: pull.merge,
		notes: [
			...(pieces.reviews?.notes ?? []),
			...pieces.inline.filter((entry) => entry.review === null || !pending.has(entry.review)).map((entry) => entry.note),
			...pieces.comments,
		],
	};
};
