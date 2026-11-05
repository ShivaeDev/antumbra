import { backendModel } from "@antumbra/domain-backends/rows/backend-model.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { Resolution } from "#queries/resolve.ts";
import { roleSetting } from "#rows/role-setting.ts";

export const RoleDefault = Schema.Struct({ ...roleSetting.fields, resolved: Resolution });

export const defaults = query("defaults", {
	input: {},
	output: Schema.Array(RoleDefault),
	reads: [roleSetting, backendModel],
});
