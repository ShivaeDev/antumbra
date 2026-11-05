import { ArtifactsEvent } from "@antumbra/platform-vocabulary/artifacts-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { apply, reset } from "#artifacts/projection.ts";
import { rows } from "#artifacts/rows.ts";
import { ExecutionDefinition } from "#execution/definition.ts";
import { Records } from "#records.ts";
export const initialize = Effect.fn("ArtifactsHistory.initialize")(function* () {
	const derived = (yield* ExecutionDefinition).refresh.pipe(Effect.provideService(Records, yield* Records));
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "artifacts",
		schema: ArtifactsEvent,
		version: 1,
		projections: [{ name: "artifacts", apply: (event) => apply(handles)(event).pipe(Effect.andThen(derived)), reset }],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
