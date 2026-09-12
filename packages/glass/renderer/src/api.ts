import type { ProviderCapacities } from "@antumbra/glass-capacity/capacity.tsx";
import type { QuayPanel } from "@antumbra/glass-changes/quay-panel.tsx";
import type { HoldsPanel } from "@antumbra/glass-holds/holds.tsx";
import type { RoleSettingsApi } from "@antumbra/glass-role-settings/glass.ts";
import type { RulingsPanel } from "@antumbra/glass-rulings/rulings.tsx";
import type { FleetPanel } from "@antumbra/glass-sessions/fleet.tsx";
import type { SettingsApi } from "@antumbra/glass-settings/glass.ts";
import type { Flagship } from "@antumbra/glass-voyages/flagship.tsx";
import type { VoyageDetail } from "@antumbra/glass-voyages/voyage-detail.tsx";
import type { ComponentProps } from "react";

export type RendererApi = SettingsApi &
	RoleSettingsApi &
	ComponentProps<typeof ProviderCapacities>["api"] &
	ComponentProps<typeof FleetPanel>["api"] &
	ComponentProps<typeof VoyageDetail>["api"] &
	ComponentProps<typeof Flagship>["api"] &
	ComponentProps<typeof QuayPanel>["api"] &
	ComponentProps<typeof HoldsPanel>["api"] &
	ComponentProps<typeof RulingsPanel>["api"];
