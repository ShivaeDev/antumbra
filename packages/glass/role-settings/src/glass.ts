import { backends } from "@antumbra/backends/feature.ts";
import { connect, type Glass } from "@antumbra/glass-client/connect.ts";
import type { Reach } from "@antumbra/glass-client/serving.ts";
import { roleSettings } from "@antumbra/role-settings/feature.ts";
import { settings } from "@antumbra/settings-domain/feature.ts";

export type ConsoleGlass = Glass<readonly [typeof roleSettings, typeof backends, typeof settings]>;

export type RoleSettingsApi = Glass<readonly [typeof roleSettings, typeof backends]>["api"];

export type Choose = RoleSettingsApi["roleSettings"]["choose"];

export const consoleGlass = (reach: Reach): ConsoleGlass => connect([roleSettings, backends, settings], reach);
