import { query } from "@antumbra/feature/query.ts";
import { AGENT_ROLES } from "@antumbra/vocabulary/agent-role.ts";
import { Effect, Schema } from "effect";
import { FLEET, roleSettingId } from "#ids.ts";
import { roleSetting } from "#rows/role-setting.ts";

export const defaults = query("defaults", {
	input: {},
	output: Schema.Array(roleSetting.Row),
	reads: [roleSetting],
	scope: () => FLEET,
	run: Effect.fn("roleSettings.defaults")(function* (_input, rows) {
		const stored = yield* rows.roleSetting.where({ scope: FLEET });
		return AGENT_ROLES.map(
			(role) =>
				stored.find((candidate) => candidate.role === role) ?? {
					backend: null,
					effort: null,
					id: roleSettingId(FLEET, role),
					model: null,
					role,
					scope: FLEET,
				},
		);
	}),
});
