import { backendModel } from "@antumbra/domain-backends/rows/backend-model.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { VOYAGE_AGENT_ROLES } from "@antumbra/platform-vocabulary/agent-role.ts";
import { Effect, Schema } from "effect";
import { FLEET, roleSettingId } from "#ids.ts";
import { RoleDefault } from "#queries/defaults.ts";
import { resolution, UNCHOSEN } from "#queries/resolve.ts";
import { roleSetting } from "#rows/role-setting.ts";

export const forVoyage = query("forVoyage", {
	input: { voyageId: Schema.String },
	output: Schema.Array(RoleDefault),
	reads: [roleSetting, backendModel],
	run: Effect.fn("roleSettings.forVoyage")(function* (input, rows) {
		const stored = yield* rows.roleSetting.where({ scope: input.voyageId });
		const fleet = yield* rows.roleSetting.where({ scope: FLEET });
		const catalogue = yield* rows.backendModel.where({});
		const listed: Array<typeof RoleDefault.Type> = [];
		for (const role of VOYAGE_AGENT_ROLES) {
			const held = stored.find((candidate) => candidate.role === role);
			const chosen = held ?? { ...UNCHOSEN, id: roleSettingId(input.voyageId, role), role, scope: input.voyageId };
			const standing = fleet.find((candidate) => candidate.role === role) ?? UNCHOSEN;
			listed.push({ ...chosen, resolved: resolution(chosen, standing, catalogue) });
		}
		return listed;
	}),
});
