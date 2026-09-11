import type { Fields, Values } from "@antumbra/platform-feature/fields.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import type { Cause, Stream } from "effect";
import type * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import type { Unauthorized } from "#token.ts";

export interface Watch<Query extends QueryShape, Failure> {
	(input: Values<Query["input"]>): Stream.Stream<Query["output"]["Type"], Failure | Unauthorized>;
	readonly atom: (
		input: Values<Query["input"]>,
	) => Atom.Atom<AsyncResult.AsyncResult<Query["output"]["Type"], Cause.NoSuchElementError | Failure | Unauthorized>>;
}

export interface Watching {
	(input: Record<string, unknown>): Stream.Stream<unknown, unknown>;
	readonly atom: (input: Record<string, unknown>) => Atom.Atom<AsyncResult.AsyncResult<unknown, unknown>>;
}

export const watching = (fields: Fields, live: (input: Record<string, unknown>) => Stream.Stream<unknown, unknown>): Watching => {
	const named = Object.keys(fields);
	const held = new Map<string, Atom.Atom<AsyncResult.AsyncResult<unknown, unknown>>>();
	const atom = (input: Record<string, unknown>): Atom.Atom<AsyncResult.AsyncResult<unknown, unknown>> => {
		const key = JSON.stringify(named.map((name) => input[name]));
		const known = held.get(key);
		if (known !== undefined) {
			return known;
		}
		const made = Atom.make(live(input));
		held.set(key, made);
		return made;
	};
	return Object.assign((input: Record<string, unknown>) => live(input), { atom });
};
