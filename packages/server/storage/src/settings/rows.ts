import { row } from "@antumbra/platform-feature/row.ts";
import { SettingCount, SettingFlag } from "@antumbra/platform-vocabulary/settings.ts";
import { Records } from "#records.ts";
export const rows = Records;

export const flag = row("flag", SettingFlag.fields, { key: "key", scope: "scope" });

export const count = row("count", SettingCount.fields, { key: "key", scope: "scope" });
