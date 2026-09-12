import { agents } from "@antumbra/domain-agents/feature.ts";
import { artifacts } from "@antumbra/domain-artifacts/feature.ts";
import { backends } from "@antumbra/domain-backends/feature.ts";
import { boards } from "@antumbra/domain-boards/feature.ts";
import { capacity } from "@antumbra/domain-capacity/feature.ts";
import { changes } from "@antumbra/domain-changes/feature.ts";
import { costs } from "@antumbra/domain-costs/feature.ts";
import { inputs } from "@antumbra/domain-inputs/feature.ts";
import { lifecycle } from "@antumbra/domain-lifecycle/feature.ts";
import { mail } from "@antumbra/domain-mail/feature.ts";
import { pieces } from "@antumbra/domain-pieces/feature.ts";
import { reclamation } from "@antumbra/domain-reclamation/feature.ts";
import { reports } from "@antumbra/domain-reports/feature.ts";
import { repos } from "@antumbra/domain-repos/feature.ts";
import { roleSettings } from "@antumbra/domain-role-settings/feature.ts";
import { rulings } from "@antumbra/domain-rulings/feature.ts";
import { sessions } from "@antumbra/domain-sessions/feature.ts";
import { settings } from "@antumbra/domain-settings/feature.ts";
import { starts } from "@antumbra/domain-starts/feature.ts";
import { voyages } from "@antumbra/domain-voyages/feature.ts";

export const features = [
	roleSettings,
	backends,
	settings,
	voyages,
	pieces,
	mail,
	boards,
	repos,
	reports,
	artifacts,
	capacity,
	reclamation,
	sessions,
	agents,
	inputs,
	starts,
	changes,
	rulings,
	lifecycle,
	costs,
] as const;
