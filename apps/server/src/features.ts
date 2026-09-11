import { backends } from "@antumbra/backends/feature.ts";
import { roleSettings } from "@antumbra/role-settings/feature.ts";
import { settings } from "@antumbra/settings-domain/feature.ts";

export const features = [roleSettings, backends, settings] as const;
