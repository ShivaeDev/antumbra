import { Result } from "effect";
import { commentsFrom, type Inline, inlineFrom, type Note, type Reviews, reviewsFrom } from "#pr/notes.ts";
import { type Checks, type Ci, checksFrom, type Lifecycle, type Pull, pullFrom } from "#pr/pull.ts";

export type Outcome =
	| { readonly kind: "body"; readonly body: string }
	| { readonly kind: "failed"; readonly message: string }
	| { readonly kind: "same" };

export type Reading = {
	readonly checks: { readonly head: string; readonly outcome: Outcome } | undefined;
	readonly comments: Outcome;
	readonly inline: Outcome;
	readonly pull: Outcome;
	readonly reviews: Outcome;
};

export type Pieces = {
	readonly checks: (Checks & { readonly head: string }) | undefined;
	readonly comments: readonly Note[];
	readonly inline: readonly Inline[];
	readonly pull: Pull | undefined;
	readonly reviews: Reviews | undefined;
};

export type Observation = {
	readonly changesRequested: boolean;
	readonly ci: Ci;
	readonly conflict: boolean | undefined;
	readonly failed: readonly string[];
	readonly head: string;
	readonly lifecycle: Lifecycle;
	readonly notes: readonly Note[];
};

export const nothing: Pieces = { checks: undefined, comments: [], inline: [], pull: undefined, reviews: undefined };

type Update<A> = { readonly error: string | undefined; readonly value: A };

const update = <A>(previous: A, outcome: Outcome | undefined, decode: (body: string) => Result.Result<A, string>): Update<A> => {
	if (outcome === undefined || outcome.kind === "same") return { error: undefined, value: previous };
	if (outcome.kind === "failed") return { error: outcome.message, value: previous };
	return Result.match(decode(outcome.body), {
		onFailure: (message) => ({ error: message, value: previous }),
		onSuccess: (value) => ({ error: undefined, value }),
	});
};

export const absorb = (pieces: Pieces, reading: Reading): { readonly error: string | undefined; readonly pieces: Pieces } => {
	const pull = update<Pull | undefined>(pieces.pull, reading.pull, pullFrom);
	const seen = reading.checks;
	const checks = update(pieces.checks, seen?.outcome, (body) => Result.map(checksFrom(body), (facts) => ({ ...facts, head: seen?.head ?? "" })));
	const reviews = update<Reviews | undefined>(pieces.reviews, reading.reviews, reviewsFrom);
	const inline = update<readonly Inline[]>(pieces.inline, reading.inline, inlineFrom);
	const comments = update<readonly Note[]>(pieces.comments, reading.comments, commentsFrom);
	return {
		error: pull.error ?? checks.error ?? reviews.error ?? inline.error ?? comments.error,
		pieces: { checks: checks.value, comments: comments.value, inline: inline.value, pull: pull.value, reviews: reviews.value },
	};
};

export const observationFrom = (pieces: Pieces): Observation | undefined => {
	const pull = pieces.pull;
	if (pull === undefined) return undefined;
	const pending = new Set(pieces.reviews?.pending ?? []);
	const checks = pieces.checks?.head === pull.head ? pieces.checks : undefined;
	return {
		changesRequested: pieces.reviews?.changesRequested ?? false,
		ci: checks?.ci ?? "none",
		conflict: pull.conflict,
		failed: checks?.failed ?? [],
		head: pull.head,
		lifecycle: pull.lifecycle,
		notes: [
			...(pieces.reviews?.notes ?? []),
			...pieces.inline.filter((entry) => entry.review === null || !pending.has(entry.review)).map((entry) => entry.note),
			...pieces.comments,
		],
	};
};
