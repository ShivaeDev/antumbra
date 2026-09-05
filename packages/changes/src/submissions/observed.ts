import type { ChangeObservation } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { applyObservations } from "#submissions/observations.ts";

export const observedChanges = Effect.fn("Changes.observed")(function* (hostTag: string, observations: ReadonlyArray<ChangeObservation>) {
	return yield* applyObservations(hostTag, observations);
});
