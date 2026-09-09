import { backends } from "@antumbra/backends/feature.ts";
import { roleSettings } from "@antumbra/role-settings/feature.ts";

export const features = [roleSettings, backends] as const;
