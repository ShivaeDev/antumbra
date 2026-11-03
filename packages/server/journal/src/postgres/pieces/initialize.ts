import { PieceEvent } from "@antumbra/platform-vocabulary/piece-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { apply, reset } from "#postgres/pieces/projection.ts";

export const initialize = Effect.fn("PieceHistory.initialize")(function* () {
	return yield* makeEventStore({ name: "pieces", schema: PieceEvent, version: 1, projections: [{ name: "pieces", apply, reset }] });
})();
export type History = Effect.Success<typeof initialize>;
