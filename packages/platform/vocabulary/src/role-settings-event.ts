import { Schema } from "effect";
import { AgentRoleSchema } from "#agent-role.ts";

export const RoleSettingChosenPayload = Schema.Struct({
	scope: Schema.String,
	role: AgentRoleSchema,
	backend: Schema.NullOr(Schema.String),
	model: Schema.NullOr(Schema.String),
	effort: Schema.NullOr(Schema.String),
});
export const RoleSettingsEvent = Schema.Union([
	Schema.Struct({ _tag: Schema.Literal("RoleSettingChosen"), ...RoleSettingChosenPayload.fields, at: Schema.Number }),
]);
