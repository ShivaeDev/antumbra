import { backendModel } from "@antumbra/domain-backends/rows/backend-model.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { AGENT_ROLES } from "@antumbra/platform-vocabulary/agent-role.ts";
import { Effect, Schema } from "effect";
import { FLEET, roleSettingId } from "#ids.ts";
import { Resolution, resolution, UNCHOSEN } from "#queries/resolve.ts";
import { roleSetting } from "#rows/role-setting.ts";

export const RoleDefault = Schema.Struct({ ...roleSetting.fields, resolved: Resolution });

export const defaults = query("defaults", {
	input: {},
	output: Schema.Array(RoleDefault),
	reads: [roleSetting, backendModel],
	run: Effect.fn("roleSettings.defaults")(function* (_input, rows) {
		const stored = yield* rows.roleSetting.where({ scope: FLEET });
		const catalogue = yield* rows.backendModel.where({});
		const listed: Array<typeof RoleDefault.Type> = [];
		for (const role of AGENT_ROLES) {
			const held = stored.find((candidate) => candidate.role === role);
			const chosen = held ?? { ...UNCHOSEN, id: roleSettingId(FLEET, role), role, scope: FLEET };
			listed.push({ ...chosen, resolved: resolution(chosen, UNCHOSEN, catalogue) });
		}
		return listed;
	}),
});
