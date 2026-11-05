import { row } from "@antumbra/platform-feature/row.ts";
import { RoleSetting } from "@antumbra/platform-vocabulary/role-settings.ts";
import { Records } from "#records.ts";
export const rows = Records;

export const roleSetting = row("roleSetting", RoleSetting.fields, { key: "id", scope: "scope" });
