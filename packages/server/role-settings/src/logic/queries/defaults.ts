import type * as Source from "@antumbra/domain-role-settings/queries/defaults.ts";
import { roleSetting } from "@antumbra/domain-role-settings/rows/role-setting.ts";
import { AGENT_ROLES } from "@antumbra/platform-vocabulary/agent-role.ts";
import { FLEET, roleSettingId } from "@antumbra/platform-vocabulary/role-settings-ids.ts";
import { selection as backendModelSelection } from "@antumbra/server-storage/records/backend-model.ts";
import { selection as roleSettingSelection } from "@antumbra/server-storage/records/role-setting.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";
import { Resolution, resolution, UNCHOSEN } from "#logic/queries/resolve.ts";

export const RoleDefault = Schema.Struct({ ...roleSetting.fields, resolved: Resolution });

export const defaults = Effect.fn("roleSettings.defaults")(function* (
	_input: Schema.Struct.Type<typeof Source.defaults.input>,
): Effect.fn.Return<typeof Source.defaults.output.Type, never, Records> {
	const rows = yield* Records;

	const stored = yield* rows.roleSetting
		.findMany({ where: { scope: FLEET }, orderBy: { field: "storage_order", direction: "asc" }, select: roleSettingSelection })
		.pipe(Effect.orDie);
	const catalogue = yield* rows.backendModel
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: backendModelSelection })
		.pipe(Effect.orDie);
	const listed: Array<typeof RoleDefault.Type> = [];
	for (const role of AGENT_ROLES) {
		const held = stored.find((candidate) => candidate.role === role);
		const chosen = held ?? { ...UNCHOSEN, id: roleSettingId(FLEET, role), role, scope: FLEET };
		listed.push({ ...chosen, resolved: resolution(chosen, UNCHOSEN, catalogue) });
	}
	return listed;
});
