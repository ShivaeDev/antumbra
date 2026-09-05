import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { decodeVoyage } from "#voyage/decode.ts";
export const readVoyages = Effect.fnUntraced(function* () {
	const db = yield* Database;
	return yield* Effect.forEach(yield* db.Voyage.orderBy((voyage) => voyage.createdAt.asc()).all(), decodeVoyage);
});
