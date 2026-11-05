import { RoleSettingsEvent } from "@antumbra/platform-vocabulary/role-settings-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { ExecutionDefinition } from "#execution/definition.ts";
import { Records } from "#records.ts";
import { apply, reset } from "#role-settings/projection.ts";
import { rows } from "#role-settings/rows.ts";
export const initialize = Effect.fn("RoleSettingsHistory.initialize")(function* () {
	const derived = (yield* ExecutionDefinition).refresh.pipe(Effect.provideService(Records, yield* Records));
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "role-settings",
		schema: RoleSettingsEvent,
		version: 1,
		projections: [{ name: "role-settings", apply: (event) => apply(handles)(event).pipe(Effect.andThen(derived)), reset }],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
