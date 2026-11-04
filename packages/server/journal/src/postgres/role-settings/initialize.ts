import { RoleSettingsEvent } from "@antumbra/platform-vocabulary/role-settings-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { apply, reset } from "#postgres/role-settings/projection.ts";
import { rows } from "#postgres/role-settings/rows.ts";
export const initialize = Effect.fn("RoleSettingsHistory.initialize")(function* () {
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "role-settings",
		schema: RoleSettingsEvent,
		version: 1,
		projections: [{ name: "role-settings", apply: apply(handles), reset }],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
