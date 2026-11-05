import { VoyageEvent } from "@antumbra/platform-vocabulary/voyage.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { ExecutionDefinition } from "#execution/definition.ts";
import { Records } from "#records.ts";
import { apply, reset } from "#voyages/projection.ts";

export const initialize = Effect.fn("VoyageHistory.initialize")(function* () {
	const derived = (yield* ExecutionDefinition).refresh.pipe(Effect.provideService(Records, yield* Records));
	return yield* makeEventStore({
		name: "voyages",
		schema: VoyageEvent,
		version: 1,
		projections: [{ name: "voyages", apply: (event) => apply(event).pipe(Effect.andThen(derived)), reset }],
	});
})();

export type History = Effect.Success<typeof initialize>;
