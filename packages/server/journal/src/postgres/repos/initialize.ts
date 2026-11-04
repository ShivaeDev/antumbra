import { ReposEvent } from "@antumbra/platform-vocabulary/repos-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { apply, reset } from "#postgres/repos/projection.ts";
import { rows } from "#postgres/repos/rows.ts";
export const initialize = Effect.fn("ReposHistory.initialize")(function* () {
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "repos",
		schema: ReposEvent,
		version: 1,
		projections: [{ name: "repos", apply: apply(handles), reset }],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
