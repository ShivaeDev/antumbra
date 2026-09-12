import { backends } from "@antumbra/domain-backends/feature.ts";
import { boards } from "@antumbra/domain-boards/feature.ts";
import { mail } from "@antumbra/domain-mail/feature.ts";
import { pieces } from "@antumbra/domain-pieces/feature.ts";
import { roleSettings } from "@antumbra/domain-role-settings/feature.ts";
import { settings } from "@antumbra/domain-settings/feature.ts";
import { voyages } from "@antumbra/domain-voyages/feature.ts";

export const features = [roleSettings, backends, settings, voyages, pieces, mail, boards] as const;
