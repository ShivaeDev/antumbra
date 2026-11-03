import { VoyageEvent } from "@antumbra/platform-vocabulary/voyage.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { apply, reset } from "#postgres/voyages/projection.ts";

export const initialize = Effect.fn("VoyageHistory.initialize")(function* () {
	return yield* makeEventStore({ name: "voyages", schema: VoyageEvent, version: 1, projections: [{ name: "voyages", apply, reset }] });
})();

export type History = Effect.Success<typeof initialize>;
