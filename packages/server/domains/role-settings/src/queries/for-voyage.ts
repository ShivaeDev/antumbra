import { query } from "@antumbra/feature/query.ts";
import { VOYAGE_AGENT_ROLES } from "@antumbra/vocabulary/agent-role.ts";
import { Effect, Schema } from "effect";
import { roleSettingId } from "#ids.ts";
import { roleSetting } from "#rows/role-setting.ts";

export const forVoyage = query("forVoyage", {
	input: { voyageId: Schema.String },
	output: Schema.Array(roleSetting.Row),
	reads: [roleSetting],
	scope: (input) => input.voyageId,
	run: Effect.fn("roleSettings.forVoyage")(function* (input, rows) {
		const stored = yield* rows.roleSetting.where({ scope: input.voyageId });
		return VOYAGE_AGENT_ROLES.map(
			(role) =>
				stored.find((candidate) => candidate.role === role) ?? {
					backend: null,
					effort: null,
					id: roleSettingId(input.voyageId, role),
					model: null,
					role,
					scope: input.voyageId,
				},
		);
	}),
});
