import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { changeRow } from "#change-read.ts";

export const changeById = Effect.fn("Changes.byId")(function* (changeId: string) {
	const db = yield* Database;
	const row = yield* db.Change.where({ id: changeId }).first();
	return yield* Option.match(row, {
		onNone: () => Effect.succeed(Option.none()),
		onSome: (stored) => changeRow(stored).pipe(Effect.map(Option.some)),
	});
});
