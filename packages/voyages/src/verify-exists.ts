import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { VoyageNotFound } from "#errors.ts";

export const verifyExists = Effect.fn("Voyages.verifyExists")(function* (voyageId: string) {
	const db = yield* Database;
	const found = yield* db.Voyage.where({ id: voyageId }).exists();
	if (!found) {
		return yield* new VoyageNotFound({ voyageId });
	}
});
