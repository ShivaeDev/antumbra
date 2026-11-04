import { Schema } from "effect";
import { AgentRoleSchema } from "#agent-role.ts";
import { RoleSettingId } from "#role-settings-ids.ts";

export const RoleSetting = Schema.Struct({
	id: RoleSettingId,
	scope: Schema.String,
	role: AgentRoleSchema,
	backend: Schema.NullOr(Schema.String),
	model: Schema.NullOr(Schema.String),
	effort: Schema.NullOr(Schema.String),
});
