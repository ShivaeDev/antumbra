import { InputsEvent } from "@antumbra/platform-vocabulary/inputs-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { apply, reset } from "#postgres/inputs/projection.ts";
import { rows } from "#postgres/inputs/rows.ts";
export const initialize = Effect.fn("InputsHistory.initialize")(function* () {
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "inputs",
		schema: InputsEvent,
		version: 1,
		projections: [{ name: "inputs", apply: apply(handles), reset }],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
