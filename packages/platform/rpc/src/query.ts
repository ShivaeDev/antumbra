import type { Fields, Values } from "@antumbra/platform-feature/fields.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import { Cause, Option, type Stream } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import { RpcClientError } from "effect/unstable/rpc/RpcClientError";
import type { Unauthorized } from "#token.ts";

const AGAIN_AFTER = 1000;

export const lostConnection = (result: AsyncResult.AsyncResult<unknown, unknown>): boolean => {
	if (!AsyncResult.isFailure(result)) return false;
	const error = Cause.findErrorOption(result.cause);
	if (Option.isNone(error)) return false;
	const failure = error.value;
	return failure instanceof RpcClientError && failure.reason._tag !== "RpcClientDefect";
};

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

const reconnecting = (source: Atom.Atom<AsyncResult.AsyncResult<unknown, unknown>>): Atom.Atom<AsyncResult.AsyncResult<unknown, unknown>> =>
	Atom.transform(source, (get) => {
		const result = get(source);
		if (lostConnection(result)) {
			const waited = setTimeout(() => get.refresh(source), AGAIN_AFTER);
			get.addFinalizer(() => clearTimeout(waited));
		}
		return result;
	});

export const watching = (fields: Fields, live: (input: Record<string, unknown>) => Stream.Stream<unknown, unknown>): Watching => {
	const named = Object.keys(fields);
	const held = new Map<string, Atom.Atom<AsyncResult.AsyncResult<unknown, unknown>>>();
	const atom = (input: Record<string, unknown>): Atom.Atom<AsyncResult.AsyncResult<unknown, unknown>> => {
		const key = JSON.stringify(named.map((name) => input[name]));
		const known = held.get(key);
		if (known !== undefined) {
			return known;
		}
		const made = reconnecting(Atom.make(live(input)));
		held.set(key, made);
		return made;
	};
	return Object.assign((input: Record<string, unknown>) => live(input), { atom });
};
