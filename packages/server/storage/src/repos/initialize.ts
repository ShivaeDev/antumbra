import { ReposEvent } from "@antumbra/platform-vocabulary/repos-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { ExecutionDefinition } from "#execution/definition.ts";
import { Records } from "#records.ts";
import { apply, reset } from "#repos/projection.ts";
import { rows } from "#repos/rows.ts";
export const initialize = Effect.fn("ReposHistory.initialize")(function* () {
	const derived = (yield* ExecutionDefinition).refresh.pipe(Effect.provideService(Records, yield* Records));
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "repos",
		schema: ReposEvent,
		version: 1,
		projections: [
			{ name: "repos", apply: (event) => apply(handles)(event).pipe(Effect.provideService(Records, handles), Effect.andThen(derived)), reset },
		],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
