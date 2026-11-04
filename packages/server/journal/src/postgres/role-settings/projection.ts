import type { RoleSettingsEvent } from "@antumbra/platform-vocabulary/role-settings-event.ts";
import { roleSettingId } from "@antumbra/platform-vocabulary/role-settings-ids.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import type { rows } from "#postgres/role-settings/rows.ts";

export const apply = (handles: Effect.Success<typeof rows>) =>
	Effect.fn("RoleSettingsHistory.apply")(function* ({ value }: Event<typeof RoleSettingsEvent.Type>) {
		const id = roleSettingId(value.scope, value.role);
		const row = { id, scope: value.scope, role: value.role, backend: value.backend, model: value.model, effort: value.effort };
		if (yield* handles.roleSetting.exists(id)) yield* handles.roleSetting.update(id, row);
		else yield* handles.roleSetting.insert(row);
	});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from antumbra."roleSetting"`;
	yield* sql`insert into antumbra."roleSetting" (id, scope, role, backend, model, effort) select id, scope, role, backend, model, effort from antumbra.voyage_roles`;
	yield* invalidateOnCommit(["roleSetting"]);
});
