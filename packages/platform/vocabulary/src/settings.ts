import { Schema } from "effect";
import { CountKey, FlagKey } from "#settings-ids.ts";

export const SettingCount = Schema.Struct({ key: CountKey, scope: Schema.String, count: Schema.Number });

export const SettingFlag = Schema.Struct({ key: FlagKey, scope: Schema.String, on: Schema.Boolean });
