import type * as Source from "@antumbra/domain-role-settings/queries/for-voyage.ts";
import { VOYAGE_AGENT_ROLES } from "@antumbra/platform-vocabulary/agent-role.ts";
import { FLEET, roleSettingId } from "@antumbra/platform-vocabulary/role-settings-ids.ts";
import { selection as backendModelSelection } from "@antumbra/server-storage/records/backend-model.ts";
import { selection as roleSettingSelection } from "@antumbra/server-storage/records/role-setting.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
import type { RoleDefault } from "#logic/queries/defaults.ts";
import { resolution, UNCHOSEN } from "#logic/queries/resolve.ts";

export const forVoyage = Effect.fn("roleSettings.forVoyage")(function* (
	input: Schema.Struct.Type<typeof Source.forVoyage.input>,
): Effect.fn.Return<typeof Source.forVoyage.output.Type, never, Records> {
	const rows = yield* Records;

	const stored = yield* rows.roleSetting
		.findMany({ where: { scope: input.voyageId }, orderBy: { field: "storage_order", direction: "asc" }, select: roleSettingSelection })
		.pipe(Effect.orDie);
	const fleet = yield* rows.roleSetting
		.findMany({ where: { scope: FLEET }, orderBy: { field: "storage_order", direction: "asc" }, select: roleSettingSelection })
		.pipe(Effect.orDie);
	const catalogue = yield* rows.backendModel
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: backendModelSelection })
		.pipe(Effect.orDie);
	const listed: Array<typeof RoleDefault.Type> = [];
	for (const role of VOYAGE_AGENT_ROLES) {
		const held = stored.find((candidate) => candidate.role === role);
		const chosen = held ?? { ...UNCHOSEN, id: roleSettingId(input.voyageId, role), role, scope: input.voyageId };
		const standing = fleet.find((candidate) => candidate.role === role) ?? UNCHOSEN;
		listed.push({ ...chosen, resolved: resolution(chosen, standing, catalogue) });
	}
	return listed;
});
