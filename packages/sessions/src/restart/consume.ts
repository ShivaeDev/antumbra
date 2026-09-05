import { Database } from "@antumbra/persistence";
import { Effect, Option, Schema } from "effect";
import { RESTART_RESUME } from "#restart/record.ts";

const decodeSessionIds = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Array(Schema.String)));

export const consume = Effect.fn("SessionRestart.consume")(function* () {
	const db = yield* Database;
	const intent = yield* db.AppMeta.where(RESTART_RESUME).first();
	if (Option.isNone(intent)) {
		return [];
	}
	yield* db.AppMeta.where(RESTART_RESUME).deleteAll();
	return yield* decodeSessionIds(intent.value.value);
});
