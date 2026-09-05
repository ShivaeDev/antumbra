import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { changeRow } from "#change-read.ts";

export const watchableChanges = Effect.fn("Changes.watchable")(function* (hostTag: string) {
	const db = yield* Database;
	return yield* Effect.forEach(yield* db.Change.where({ host: hostTag, stage: "open" }).all(), changeRow);
});
