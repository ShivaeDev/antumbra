import { BackendsEvent } from "@antumbra/platform-vocabulary/backends-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { apply, reset } from "#backends/projection.ts";
import { rows } from "#backends/rows.ts";
import { ExecutionDefinition } from "#execution/definition.ts";
import { Records } from "#records.ts";
export const initialize = Effect.fn("BackendsHistory.initialize")(function* () {
	const derived = (yield* ExecutionDefinition).refresh.pipe(Effect.provideService(Records, yield* Records));
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "backends",
		schema: BackendsEvent,
		version: 1,
		projections: [{ name: "backends", apply: (event) => apply(handles)(event).pipe(Effect.andThen(derived)), reset }],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
