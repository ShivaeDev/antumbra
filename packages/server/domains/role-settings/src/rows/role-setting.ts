import { row } from "@antumbra/platform-feature/row.ts";
import { RoleSetting } from "@antumbra/platform-vocabulary/role-settings.ts";
export const roleSetting = row("roleSetting", RoleSetting.fields, { key: "id", scope: "scope" });
