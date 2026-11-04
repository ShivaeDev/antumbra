import { BackendsEvent } from "@antumbra/platform-vocabulary/backends-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { apply, reset } from "#postgres/backends/projection.ts";
import { rows } from "#postgres/backends/rows.ts";
export const initialize = Effect.fn("BackendsHistory.initialize")(function* () {
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "backends",
		schema: BackendsEvent,
		version: 1,
		projections: [{ name: "backends", apply: apply(handles), reset }],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
