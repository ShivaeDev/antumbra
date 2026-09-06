import type { Fields, QueryDefinition, RowShape, Values } from "@antumbra/journal";
import { Context, Effect, type Schema, type Stream } from "effect";
import type { Reactivity } from "effect/unstable/reactivity/Reactivity";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import { codecOf, type Registry } from "#app.ts";
import { scopeKey, tableKey } from "#keys.ts";
import { readHandle } from "#read-handle.ts";

export interface LiveService {
	readonly live: <Name extends string, Input extends Fields, Output extends Schema.Top, Reads extends readonly RowShape[]>(
		query: QueryDefinition<Name, Input, Output, Reads>,
		input: Values<Input>,
	) => Stream.Stream<Output["Type"]>;
}

export class Live extends Context.Service<Live, LiveService>()("@antumbra/journal-server/Live") {}

export interface LiveContext {
	readonly reactivity: Reactivity["Service"];
	readonly registry: Registry;
	readonly sql: SqlClient;
}

interface RunnableQuery {
	readonly reads: readonly RowShape[];
	readonly run: (input: Record<string, unknown>, rows: Record<string, unknown>) => Effect.Effect<unknown, unknown>;
	readonly scope: ((input: Record<string, unknown>) => string) | undefined;
}

export const keysOf = (reads: readonly RowShape[], scope: string | undefined): readonly string[] =>
	reads.map((row) => (scope === undefined ? tableKey(row.name) : scopeKey(row.name, scope)));

const watch = (context: LiveContext, query: RunnableQuery, input: Record<string, unknown>): Stream.Stream<unknown> => {
	const rows = Object.fromEntries(query.reads.map((row) => [row.name, readHandle(context.sql, codecOf(context.registry, row))]));
	return context.reactivity.stream(keysOf(query.reads, query.scope?.(input)), Effect.orDie(query.run(input, rows)));
};

export function liveService(context: LiveContext): LiveService;
export function liveService(context: LiveContext): unknown {
	return { live: (query: RunnableQuery, input: Record<string, unknown>) => watch(context, query, input) };
}
