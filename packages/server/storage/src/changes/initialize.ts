import { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { apply, reset } from "#changes/projection.ts";
import { rows } from "#changes/rows.ts";
import { ExecutionDefinition } from "#execution/definition.ts";
import { Records } from "#records.ts";
export const initialize = Effect.fn("ChangesHistory.initialize")(function* () {
	const derived = (yield* ExecutionDefinition).refresh.pipe(Effect.provideService(Records, yield* Records));
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "changes",
		schema: ChangesEvent,
		version: 1,
		projections: [
			{ name: "changes", apply: (event) => apply(handles)(event).pipe(Effect.provideService(Records, handles), Effect.andThen(derived)), reset },
		],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
