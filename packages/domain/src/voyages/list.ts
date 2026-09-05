import { Effect } from "effect";
import { VoyageSummaries } from "#voyage/summaries/service.ts";

export const list = Effect.fn("Voyages.list")(function* () {
	const summaries = yield* VoyageSummaries;
	return yield* summaries.read();
});
