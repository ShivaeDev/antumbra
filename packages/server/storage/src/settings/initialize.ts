import { SettingsEvent } from "@antumbra/platform-vocabulary/settings-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { ExecutionDefinition } from "#execution/definition.ts";
import { Records } from "#records.ts";
import { apply, reset } from "#settings/projection.ts";
import { rows } from "#settings/rows.ts";
export const initialize = Effect.fn("SettingsHistory.initialize")(function* () {
	const derived = (yield* ExecutionDefinition).refresh.pipe(Effect.provideService(Records, yield* Records));
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "settings",
		schema: SettingsEvent,
		version: 1,
		projections: [{ name: "settings", apply: (event) => apply(handles)(event).pipe(Effect.andThen(derived)), reset }],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
