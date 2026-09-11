import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";
import { related } from "#voyage/related.ts";
import { voyageSummaries } from "#voyage-view.ts";

export const read = Effect.fn("VoyageSummaries.read")(function* () {
	const voyages = yield* (yield* Voyages).list();
	return voyageSummaries({ ...(yield* related(voyages.map((voyage) => voyage.id))), voyages });
});
