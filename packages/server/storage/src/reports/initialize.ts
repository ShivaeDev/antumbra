import { ReportsEvent } from "@antumbra/platform-vocabulary/reports-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { ExecutionDefinition } from "#execution/definition.ts";
import { Records } from "#records.ts";
import { apply, reset } from "#reports/projection.ts";
import { rows } from "#reports/rows.ts";
export const initialize = Effect.fn("ReportsHistory.initialize")(function* () {
	const derived = (yield* ExecutionDefinition).refresh.pipe(Effect.provideService(Records, yield* Records));
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "reports",
		schema: ReportsEvent,
		version: 1,
		projections: [{ name: "reports", apply: (event) => apply(handles)(event).pipe(Effect.andThen(derived)), reset }],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
