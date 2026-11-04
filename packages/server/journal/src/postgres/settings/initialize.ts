import { SettingsEvent } from "@antumbra/platform-vocabulary/settings-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { apply, reset } from "#postgres/settings/projection.ts";
import { rows } from "#postgres/settings/rows.ts";
export const initialize = Effect.fn("SettingsHistory.initialize")(function* () {
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "settings",
		schema: SettingsEvent,
		version: 1,
		projections: [{ name: "settings", apply: apply(handles), reset }],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
