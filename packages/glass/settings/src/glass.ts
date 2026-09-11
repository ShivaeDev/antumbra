import type { Glass } from "@antumbra/glass-client/connect.ts";
import type { settings } from "@antumbra/settings-domain/feature.ts";

export type SettingsGlass = Glass<readonly [typeof settings]>;

export type SettingsApi = SettingsGlass["api"];
