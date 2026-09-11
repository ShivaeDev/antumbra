import { backends } from "@antumbra/domain-backends/feature.ts";
import { roleSettings } from "@antumbra/domain-role-settings/feature.ts";
import { settings } from "@antumbra/domain-settings/feature.ts";
import { voyages } from "@antumbra/domain-voyages/feature.ts";
import { connect, type Glass } from "@antumbra/glass-client/connect.ts";
import type { Reach } from "@antumbra/glass-client/serving.ts";

export type ConsoleGlass = Glass<readonly [typeof roleSettings, typeof backends, typeof settings, typeof voyages]>;

export type RoleSettingsApi = Glass<readonly [typeof roleSettings, typeof backends]>["api"];

export type Choose = RoleSettingsApi["roleSettings"]["choose"];

export const consoleGlass = (reach: Reach): ConsoleGlass => connect([roleSettings, backends, settings, voyages], reach);
