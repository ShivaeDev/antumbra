import { ReportsEvent } from "@antumbra/platform-vocabulary/reports-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { apply, reset } from "#postgres/reports/projection.ts";
import { rows } from "#postgres/reports/rows.ts";
export const initialize = Effect.fn("ReportsHistory.initialize")(function* () {
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "reports",
		schema: ReportsEvent,
		version: 1,
		projections: [{ name: "reports", apply: apply(handles), reset }],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
