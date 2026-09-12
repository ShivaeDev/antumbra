import type { backends } from "@antumbra/domain-backends/feature.ts";
import type { roleSettings } from "@antumbra/domain-role-settings/feature.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";

export type RoleSettingsApi = Glass<readonly [typeof roleSettings, typeof backends]>["api"];

export type Choose = RoleSettingsApi["roleSettings"]["choose"];
