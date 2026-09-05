import { Effect } from "effect";
import { voyageSummaries } from "#voyage-view.ts";
import { VoyageWorldSource } from "#voyage-world/service.ts";

export const list = Effect.fn("Voyages.list")(function* () {
	const world = yield* VoyageWorldSource;
	return voyageSummaries(yield* world.read());
});
