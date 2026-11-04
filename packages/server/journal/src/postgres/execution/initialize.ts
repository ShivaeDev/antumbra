import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import type { Reactivity } from "effect/reactivity/Reactivity";
import type { SqlClient } from "effect/sql/SqlClient";
import { registryOf } from "#app.ts";
import { commands } from "#postgres/execution/commit.ts";
import { ExecutionDefinition } from "#postgres/execution/definition.ts";
import { ingest } from "#postgres/execution/ingest.ts";
import { apply, refresh, reset } from "#postgres/execution/project.ts";
import { restore } from "#postgres/execution/restore.ts";
import { handlesFor, rows } from "#postgres/execution/rows.ts";
import { append, cursor, locked, read, rebuild } from "#postgres/execution/write.ts";

export const initialize = Effect.fn("ExecutionHistory.initialize")(function* () {
	const model = yield* ExecutionDefinition;
	const registry = yield* registryOf(model.definition);
	const handles = yield* rows(registry);
	const store = yield* makeEventStore({
		name: "execution",
		schema: model.events,
		version: 1,
		projections: [{ name: "execution", apply: apply(registry, handles), reset }],
	});
	const state = { rows: handles, store, schema: model.events, registry };
	const context = yield* Effect.context<SqlClient | Reactivity>();
	return {
		...(yield* commands(state)),
		restore: (batches: Parameters<ReturnType<typeof restore>>[0]) => restore(state)(batches).pipe(Effect.provideContext(context)),
		write: <A, E, R>(effect: Effect.Effect<A, E, R>) => locked(effect).pipe(Effect.provideContext(context)),
		refresh: () => refresh(registry, handles)().pipe(Effect.provideContext(context)),
		ingest: (input: Parameters<ReturnType<typeof ingest>>[0]) => ingest(state)(input).pipe(Effect.provideContext(context)),
		append: (...args: Parameters<ReturnType<typeof append>>) => append(state)(...args).pipe(Effect.provideContext(context)),
		read: () => read(state)().pipe(Effect.provideContext(context)),
		rebuild: () => rebuild(state)().pipe(Effect.provideContext(context)),
		cursor: (logId: string) => cursor(logId).pipe(Effect.provideContext(context)),
		rowsFor: handlesFor(state),
	};
})();
