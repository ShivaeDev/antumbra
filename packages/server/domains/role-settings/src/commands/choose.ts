import { efforts } from "@antumbra/backends/queries/efforts.ts";
import { models } from "@antumbra/backends/queries/models.ts";
import { command } from "@antumbra/feature/command.ts";
import { choice, optional } from "@antumbra/feature/edit.ts";
import { AGENT_BACKEND_TAGS } from "@antumbra/vocabulary/agent-backend.ts";
import { AgentRoleSchema } from "@antumbra/vocabulary/agent-role.ts";
import { Effect, Schema } from "effect";
import { roleSettingChosen } from "#facts/role-setting-chosen.ts";

export const choose = command("choose", {
	input: {
		scope: Schema.String,
		role: AgentRoleSchema,
		backend: optional(Schema.Literals(AGENT_BACKEND_TAGS), { title: "Backend" }),
		model: optional(choice(models, { free: true, input: { backend: "backend" }, label: "name", value: "model" }), { title: "Model" }),
		effort: optional(choice(efforts, { free: true, input: { backend: "backend", model: "model" } }), { title: "Effort" }),
	},
	reads: [],
	emits: roleSettingChosen,
	rejections: {},
	run: (input) => Effect.succeed({ backend: input.backend, effort: input.effort, model: input.model, role: input.role, scope: input.scope }),
});
