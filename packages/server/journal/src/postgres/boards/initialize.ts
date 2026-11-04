import { BoardsEvent } from "@antumbra/platform-vocabulary/boards-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { apply, reset } from "#postgres/boards/projection.ts";
import { rows } from "#postgres/boards/rows.ts";
export const initialize = Effect.fn("BoardsHistory.initialize")(function* () {
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "boards",
		schema: BoardsEvent,
		version: 1,
		projections: [{ name: "boards", apply: apply(handles), reset }],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
