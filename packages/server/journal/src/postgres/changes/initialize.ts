import { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { apply, reset } from "#postgres/changes/projection.ts";
import { rows } from "#postgres/changes/rows.ts";
export const initialize = Effect.fn("ChangesHistory.initialize")(function* () {
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "changes",
		schema: ChangesEvent,
		version: 1,
		projections: [{ name: "changes", apply: apply(handles), reset }],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
