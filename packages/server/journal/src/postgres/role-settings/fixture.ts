import { RoleSettingsEvent } from "@antumbra/platform-vocabulary/role-settings-event.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { legacyEvents, legacyRows } from "#postgres/legacy.ts";
import { roleSetting } from "#postgres/role-settings/rows.ts";
import { RoleSettingsHistory } from "#postgres/role-settings/service.ts";
export const journalRoleSettings = Effect.fn("RoleSettingsFixture.readJournal")(function* (filename: string) {
	const source = yield* SqliteClient.make({ filename, readonly: true });
	const events = yield* legacyEvents(RoleSettingsEvent, ["RoleSettingChosen"]).pipe(Effect.provideService(SqlClient.SqlClient, source));
	return { events, roleSetting: yield* legacyRows(roleSetting).pipe(Effect.provideService(SqlClient.SqlClient, source)) };
});
export const replayRoleSettingsFixture = Effect.fn("RoleSettingsFixture.replay")(function* (
	snapshot: Effect.Success<ReturnType<typeof journalRoleSettings>>,
) {
	const history = yield* RoleSettingsHistory;
	for (const event of snapshot.events) yield* history.append(event.requestId, [event.value]);
	yield* history.rebuild();
	const rows = yield* history.rows();
	const matches = Schema.toEquivalence(Schema.Array(roleSetting.Row))(snapshot.roleSetting, yield* rows.roleSetting.where({}));
	if (!matches)
		return yield* Effect.fail(new RoleSettingsFixtureMismatch({ message: "RoleSettings history does not reproduce the captured journal rows" }));
	return { role_settings: snapshot.events.length, events: snapshot.events.length };
});
export class RoleSettingsFixtureMismatch extends Schema.TaggedError<RoleSettingsFixtureMismatch>()("RoleSettingsFixtureMismatch", {
	message: Schema.String,
}) {}
