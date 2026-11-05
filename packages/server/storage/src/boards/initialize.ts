import { BoardsEvent } from "@antumbra/platform-vocabulary/boards-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { apply, reset } from "#boards/projection.ts";
import { rows } from "#boards/rows.ts";
import { ExecutionDefinition } from "#execution/definition.ts";
import { Records } from "#records.ts";
export const initialize = Effect.fn("BoardsHistory.initialize")(function* () {
	const derived = (yield* ExecutionDefinition).refresh.pipe(Effect.provideService(Records, yield* Records));
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "boards",
		schema: BoardsEvent,
		version: 1,
		projections: [{ name: "boards", apply: (event) => apply(handles)(event).pipe(Effect.andThen(derived)), reset }],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
