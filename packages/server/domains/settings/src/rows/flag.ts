import { row } from "@antumbra/platform-feature/row.ts";
import { SettingFlag } from "@antumbra/platform-vocabulary/settings.ts";
export const flag = row("flag", SettingFlag.fields, { key: "key", scope: "scope" });
