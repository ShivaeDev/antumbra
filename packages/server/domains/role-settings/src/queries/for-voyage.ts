import { backendModel } from "@antumbra/domain-backends/rows/backend-model.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { RoleDefault } from "#queries/defaults.ts";
import { roleSetting } from "#rows/role-setting.ts";

export const forVoyage = query("forVoyage", {
	input: { voyageId: Schema.String },
	output: Schema.Array(RoleDefault),
	reads: [roleSetting, backendModel],
});
