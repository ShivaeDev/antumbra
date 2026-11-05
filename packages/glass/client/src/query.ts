import type { Fields, Values } from "@antumbra/platform-feature/fields.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import type { Unauthorized } from "@shivaedev/errors/taxonomy.ts";
import { Cause, Option, type Stream } from "effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import { RpcClientError } from "effect/rpc/RpcClientError";

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

export const watching = (fields: Fields, live: (input: Record<string, unknown>) => Stream.Stream<unknown, unknown>): Watching => {
	const named = Object.keys(fields);
	const family = Atom.family((input: Record<string, unknown>) => Atom.make(live(input)));
	const atom = (input: Record<string, unknown>) => family(Object.fromEntries(named.map((name) => [name, input[name]])));
	return Object.assign((input: Record<string, unknown>) => live(input), { atom });
};
