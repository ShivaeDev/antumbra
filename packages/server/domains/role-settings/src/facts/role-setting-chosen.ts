import { fact } from "@antumbra/feature/fact.ts";
import { AgentRoleSchema } from "@antumbra/vocabulary/agent-role.ts";
import { Schema } from "effect";

export const roleSettingChosen = fact("RoleSettingChosen", {
	scope: Schema.String,
	role: AgentRoleSchema,
	backend: Schema.NullOr(Schema.String),
	model: Schema.NullOr(Schema.String),
	effort: Schema.NullOr(Schema.String),
});
