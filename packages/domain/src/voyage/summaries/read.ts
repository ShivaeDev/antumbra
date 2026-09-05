import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { decodeVoyage } from "#voyage/decode.ts";
import { related } from "#voyage/related.ts";
import { voyageSummaries } from "#voyage-view.ts";

export const read = Effect.fn("VoyageSummaries.read")(function* () {
	const db = yield* Database;
	const voyages = yield* Effect.forEach(yield* db.Voyage.orderBy((voyage) => voyage.createdAt.asc()).all(), decodeVoyage);
	return voyageSummaries({ ...(yield* related(voyages.map((voyage) => voyage.id))), voyages });
});
