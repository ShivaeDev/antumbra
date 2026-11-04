import { row } from "@antumbra/platform-feature/row.ts";
import { RoleSetting } from "@antumbra/platform-vocabulary/role-settings.ts";
import { Effect } from "effect";
import { backendModel } from "#postgres/backends/rows.ts";
import { rowsOf } from "#postgres/rows.ts";
export const rows = Effect.gen(function* () {
	return { roleSetting: yield* rowsOf(roleSetting, "roleSetting"), backendModel: yield* rowsOf(backendModel, "backendModel") };
});

export const roleSetting = row("roleSetting", RoleSetting.fields, { key: "id", scope: "scope" });
