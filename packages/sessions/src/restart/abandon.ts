import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { RESTART_RESUME } from "#restart/record.ts";

export const abandon = Effect.fn("SessionRestart.abandon")(function* () {
	const db = yield* Database;
	yield* db.AppMeta.where(RESTART_RESUME).deleteAll();
});
