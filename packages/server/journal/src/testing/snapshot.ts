import { Effect } from "effect";
import { Database } from "#database.ts";

export const snapshotJournal = Effect.fn("Journal.snapshot")(function* (filename: string) {
	const database = yield* Database;
	yield* database.write`vacuum into ${filename}`;
});
