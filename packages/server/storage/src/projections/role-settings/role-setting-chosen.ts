import type { roleSettingChosen } from "@antumbra/domain-role-settings/facts/role-setting-chosen.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { roleSettingId } from "@antumbra/platform-vocabulary/role-settings-ids.ts";
import { selection as roleSettingSelection } from "@antumbra/server-storage/records/role-setting.ts";
import { Effect, Option } from "effect";
import { Records } from "#records.ts";

export const roleSettingChosenMaterializer = Effect.fn("roleSettings.RoleSettingChosen")(function* (
	fact: FactValue<typeof roleSettingChosen>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const id = roleSettingId(fact.scope, fact.role);
	const chosen = { backend: fact.backend, effort: fact.effort, id, model: fact.model, role: fact.role, scope: fact.scope };
	const stored = yield* rows.roleSetting
		.findOne({ where: { id: id }, orderBy: { field: "storage_order", direction: "asc" }, select: roleSettingSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(stored)) {
		return yield* rows.roleSetting.insertVoid(chosen).pipe(Effect.orDie);
	}
	yield* rows.roleSetting.updateVoid({ ...chosen, id: id }).pipe(Effect.orDie);
});
