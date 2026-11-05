import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Context, Effect } from "effect";
import { Reactivity } from "effect/reactivity/Reactivity";
import { SqlClient } from "effect/sql/SqlClient";
import { ExecutionDefinition } from "#execution/definition.ts";
import { ingest } from "#execution/ingest.ts";
import { apply, refresh, reset } from "#execution/project.ts";
import { restore } from "#execution/restore.ts";
import { ExecutionStore } from "#execution/state.ts";
import { append, cursor, locked, read, rebuild } from "#execution/write.ts";
import { Records } from "#records.ts";

export const initialize = Effect.fn("ExecutionHistory.initialize")(function* () {
	const model = yield* ExecutionDefinition;
	const handles = yield* Records;
	const store = yield* makeEventStore({
		name: "execution",
		schema: model.events,
		version: 1,
		projections: [
			{
				name: "execution",
				apply: (event) => apply(event).pipe(Effect.provideService(Records, handles), Effect.provideService(ExecutionDefinition, model)),
				reset,
			},
		],
	});
	const state = { store, schema: model.events, model };
	const context = Context.add(
		Context.pick(
			SqlClient,
			Reactivity,
			Records,
			ExecutionDefinition,
		)(yield* Effect.context<SqlClient | Reactivity | Records | ExecutionDefinition>()),
		ExecutionStore,
		state,
	);
	return {
		checkRequest: (requestId: Request) =>
			Effect.gen(function* () {
				const events = yield* store.read("execution").pipe(Effect.orDie);
				const earlier = events.findLast((event) => event.requestId === requestId);
				if (earlier !== undefined) return yield* new AlreadyDone({ requestId, seq: earlier.value.sequence });
			}).pipe(Effect.provideContext(context)),
		nextSequence: () =>
			store.read("execution").pipe(
				Effect.map((events) => (events.at(-1)?.value.sequence ?? 0) + 1),
				Effect.orDie,
				Effect.provideContext(context),
			),
		restore: (batches: Parameters<typeof restore>[0]) => restore(batches).pipe(Effect.provideContext(context)),
		write: <A, E, R>(effect: Effect.Effect<A, E, R>) => locked(effect).pipe(Effect.provideContext(context)),
		refresh: () => refresh().pipe(Effect.provideContext(context)),
		ingest: (input: Parameters<typeof ingest>[0]) => ingest(input).pipe(Effect.provideContext(context)),
		append: (...args: Parameters<typeof append>) => append(...args).pipe(Effect.provideContext(context)),
		read: () => read().pipe(Effect.provideContext(context)),
		rebuild: () => rebuild().pipe(Effect.provideContext(context)),
		cursor: (logId: string) => cursor(logId).pipe(Effect.provideContext(context)),
	};
})();
