import { PieceEvent } from "@antumbra/platform-vocabulary/piece-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { ExecutionDefinition } from "#execution/definition.ts";
import { apply, reset } from "#pieces/projection.ts";
import { Records } from "#records.ts";

export const initialize = Effect.fn("PieceHistory.initialize")(function* () {
	const derived = (yield* ExecutionDefinition).refresh.pipe(Effect.provideService(Records, yield* Records));
	return yield* makeEventStore({
		name: "pieces",
		schema: PieceEvent,
		version: 1,
		projections: [{ name: "pieces", apply: (event) => apply(event).pipe(Effect.andThen(derived)), reset }],
	});
})();
export type History = Effect.Success<typeof initialize>;
