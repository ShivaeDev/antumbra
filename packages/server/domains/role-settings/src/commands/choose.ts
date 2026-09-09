import { command } from "@antumbra/feature/command.ts";
import { AgentRoleSchema } from "@antumbra/vocabulary/agent-role.ts";
import { Effect, Schema } from "effect";
import { roleSettingChosen } from "#facts/role-setting-chosen.ts";

export const choose = command("choose", {
	input: {
		scope: Schema.String,
		role: AgentRoleSchema,
		backend: Schema.NullOr(Schema.String),
		model: Schema.NullOr(Schema.String),
		effort: Schema.NullOr(Schema.String),
	},
	reads: [],
	emits: roleSettingChosen,
	rejections: {},
	run: (input) => Effect.succeed({ backend: input.backend, effort: input.effort, model: input.model, role: input.role, scope: input.scope }),
});
