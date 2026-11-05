import { SettingsEvent } from "@antumbra/platform-vocabulary/settings-event.ts";
import { selection as countSelection } from "@antumbra/server-storage/records/count.ts";
import { selection as flagSelection } from "@antumbra/server-storage/records/flag.ts";
import { count, flag } from "@antumbra/server-storage/settings/rows.ts";
import { SettingsHistory } from "@antumbra/server-storage/settings/service.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { LegacySource } from "#source.ts";
import { legacyEvents, legacyRows } from "#v1-rows.ts";
export const journalSettings = Effect.fn("SettingsFixture.readJournal")(function* (filename: string) {
	const source = yield* (yield* LegacySource).open(filename);
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
	const rows = yield* history.rows();
	const matches =
		Schema.toEquivalence(Schema.Array(flag.Row))(
			snapshot.flag,
			yield* rows.flag.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: flagSelection }).pipe(Effect.orDie),
		) &&
		Schema.toEquivalence(Schema.Array(count.Row))(
			snapshot.count,
			yield* rows.count.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: countSelection }).pipe(Effect.orDie),
		);
	if (!matches) return yield* Effect.fail(new SettingsFixtureMismatch({ message: "Settings history does not reproduce the captured journal rows" }));
	return { settings: snapshot.events.length, events: snapshot.events.length };
});
export class SettingsFixtureMismatch extends Schema.TaggedError<SettingsFixtureMismatch>()("SettingsFixtureMismatch", { message: Schema.String }) {}
