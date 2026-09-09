import { row } from "@antumbra/feature/row.ts";
import { AgentRoleSchema } from "@antumbra/vocabulary/agent-role.ts";
import { Schema } from "effect";
import { RoleSettingId } from "#ids.ts";

export const roleSetting = row(
	"roleSetting",
	{
		id: RoleSettingId,
		scope: Schema.String,
		role: AgentRoleSchema,
		backend: Schema.NullOr(Schema.String),
		model: Schema.NullOr(Schema.String),
		effort: Schema.NullOr(Schema.String),
	},
	{ key: "id", scope: "scope" },
);
