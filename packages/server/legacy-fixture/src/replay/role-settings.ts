import { RoleSettingsEvent } from "@antumbra/platform-vocabulary/role-settings-event.ts";
import { selection as roleSettingSelection } from "@antumbra/server-storage/records/role-setting.ts";
import { roleSetting } from "@antumbra/server-storage/role-settings/rows.ts";
import { RoleSettingsHistory } from "@antumbra/server-storage/role-settings/service.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { LegacySource } from "#source.ts";
import { legacyEvents, legacyRows } from "#v1-rows.ts";
export const journalRoleSettings = Effect.fn("RoleSettingsFixture.readJournal")(function* (filename: string) {
	const source = yield* (yield* LegacySource).open(filename);
	const events = yield* legacyEvents(RoleSettingsEvent, ["RoleSettingChosen"]).pipe(Effect.provideService(SqlClient.SqlClient, source));
	return { events, roleSetting: yield* legacyRows(roleSetting).pipe(Effect.provideService(SqlClient.SqlClient, source)) };
});
export const replayRoleSettingsFixture = Effect.fn("RoleSettingsFixture.replay")(function* (
	snapshot: Effect.Success<ReturnType<typeof journalRoleSettings>>,
) {
	const history = yield* RoleSettingsHistory;
	for (const event of snapshot.events) yield* history.append(event.requestId, [event.value]);
	const rows = yield* history.rows();
	const matches = Schema.toEquivalence(Schema.Array(roleSetting.Row))(
		snapshot.roleSetting,
		yield* rows.roleSetting
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: roleSettingSelection })
			.pipe(Effect.orDie),
	);
	if (!matches)
		return yield* Effect.fail(new RoleSettingsFixtureMismatch({ message: "RoleSettings history does not reproduce the captured journal rows" }));
	return { role_settings: snapshot.events.length, events: snapshot.events.length };
});
export class RoleSettingsFixtureMismatch extends Schema.TaggedError<RoleSettingsFixtureMismatch>()("RoleSettingsFixtureMismatch", {
	message: Schema.String,
}) {}
