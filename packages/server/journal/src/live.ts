import type { Fields, Values } from "@antumbra/platform-feature/fields.ts";
import { type PortServices, type PortShape, portRecord } from "@antumbra/platform-feature/port.ts";
import type { QueryDefinition } from "@antumbra/platform-feature/query.ts";
import type { RowShape } from "@antumbra/platform-feature/row.ts";
import { Context, Effect, type Schema, type Stream } from "effect";
import type { Reactivity } from "effect/unstable/reactivity/Reactivity";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import { codecOf, type Registry } from "#app.ts";
import { scopeKey, tableKey } from "#keys.ts";
import { readHandle } from "#read-handle.ts";

export interface LiveService {
	readonly read: <
		Name extends string,
		Input extends Fields,
		Output extends Schema.Top,
		Reads extends readonly RowShape[],
		Ports extends readonly PortShape[],
	>(
		query: QueryDefinition<Name, Input, Output, Reads, Ports>,
		input: Values<Input>,
	) => Effect.Effect<Output["Type"], never, PortServices<Ports>>;
	readonly live: <
		Name extends string,
		Input extends Fields,
		Output extends Schema.Top,
		Reads extends readonly RowShape[],
		Ports extends readonly PortShape[],
	>(
		query: QueryDefinition<Name, Input, Output, Reads, Ports>,
		input: Values<Input>,
	) => Stream.Stream<Output["Type"], never, PortServices<Ports>>;
}

export class Live extends Context.Service<Live, LiveService>()("@antumbra/server-journal/Live") {}

export interface LiveContext {
	readonly reactivity: Reactivity["Service"];
	readonly registry: Registry;
	readonly sql: SqlClient;
}

interface RunnableQuery {
	readonly ports: readonly PortShape[];
	readonly reads: readonly RowShape[];
	readonly run: (input: Record<string, unknown>, rows: Record<string, unknown>, ports: Record<string, unknown>) => Effect.Effect<unknown, unknown>;
	readonly scope: ((input: Record<string, unknown>) => string) | undefined;
}

export const keysOf = (reads: readonly RowShape[], scope: string | undefined): readonly string[] =>
	reads.map((row) => (scope === undefined ? tableKey(row.name) : scopeKey(row.name, scope)));

const read = (context: LiveContext, query: RunnableQuery, input: Record<string, unknown>): Effect.Effect<unknown> =>
	Effect.gen(function* () {
		const rows = Object.fromEntries(query.reads.map((row) => [row.name, readHandle(context.sql, codecOf(context.registry, row))]));
		const ports = yield* portRecord(query.ports);
		return yield* Effect.orDie(query.run(input, rows, ports));
	});

const watch = (context: LiveContext, query: RunnableQuery, input: Record<string, unknown>): Stream.Stream<unknown> =>
	context.reactivity.stream(keysOf(query.reads, query.scope?.(input)), read(context, query, input));

export function liveService(context: LiveContext): LiveService;
export function liveService(context: LiveContext): unknown {
	return {
		read: (query: RunnableQuery, input: Record<string, unknown>) => read(context, query, input),
		live: (query: RunnableQuery, input: Record<string, unknown>) => watch(context, query, input),
	};
}
