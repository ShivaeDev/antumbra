import { backends } from "@antumbra/domain-backends/feature.ts";
import { roleSettings } from "@antumbra/domain-role-settings/feature.ts";
import { settings } from "@antumbra/domain-settings/feature.ts";

export const features = [roleSettings, backends, settings] as const;
