import type { settings } from "@antumbra/domain-settings/feature.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";

export type SettingsGlass = Glass<readonly [typeof settings]>;

export type SettingsApi = SettingsGlass["api"];
