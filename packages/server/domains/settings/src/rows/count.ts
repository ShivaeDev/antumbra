import { row } from "@antumbra/platform-feature/row.ts";
import { SettingCount } from "@antumbra/platform-vocabulary/settings.ts";
export const count = row("count", SettingCount.fields, { key: "key", scope: "scope" });
