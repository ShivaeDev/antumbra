import { backends } from "@antumbra/backends/feature.ts";
import { connect, type Glass } from "@antumbra/glass-client/connect.ts";
import type { Reach } from "@antumbra/glass-client/serving.ts";
import { roleSettings } from "@antumbra/role-settings/feature.ts";

export type RoleSettingsGlass = Glass<readonly [typeof roleSettings, typeof backends]>;

export type RoleSettingsApi = RoleSettingsGlass["api"];

export type Choose = RoleSettingsApi["roleSettings"]["choose"];

export const roleSettingsGlass = (reach: Reach): RoleSettingsGlass => connect([roleSettings, backends], reach);
