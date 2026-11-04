import { SettingsEvent } from "@antumbra/platform-vocabulary/settings-event.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { legacyEvents, legacyRows } from "#postgres/legacy.ts";
import { count, flag } from "#postgres/settings/rows.ts";
import { SettingsHistory } from "#postgres/settings/service.ts";
export const journalSettings = Effect.fn("SettingsFixture.readJournal")(function* (filename: string) {
	const source = yield* SqliteClient.make({ filename, readonly: true });
	const events = yield* legacyEvents(SettingsEvent, ["FlagSet", "CountSet"]).pipe(Effect.provideService(SqlClient.SqlClient, source));
	return {
		events,
		flag: yield* legacyRows(flag).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		count: yield* legacyRows(count).pipe(Effect.provideService(SqlClient.SqlClient, source)),
	};
});
export const replaySettingsFixture = Effect.fn("SettingsFixture.replay")(function* (snapshot: Effect.Success<ReturnType<typeof journalSettings>>) {
	const history = yield* SettingsHistory;
	for (const event of snapshot.events) yield* history.append(event.requestId, [event.value]);
	yield* history.rebuild();
	const rows = yield* history.rows();
	const matches =
		Schema.toEquivalence(Schema.Array(flag.Row))(snapshot.flag, yield* rows.flag.where({})) &&
		Schema.toEquivalence(Schema.Array(count.Row))(snapshot.count, yield* rows.count.where({}));
	if (!matches) return yield* Effect.fail(new SettingsFixtureMismatch({ message: "Settings history does not reproduce the captured journal rows" }));
	return { settings: snapshot.events.length, events: snapshot.events.length };
});
export class SettingsFixtureMismatch extends Schema.TaggedError<SettingsFixtureMismatch>()("SettingsFixtureMismatch", { message: Schema.String }) {}
