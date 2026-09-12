import type { agents } from "@antumbra/domain-agents/feature.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";
import type { PieceDisplayActions, PiecesDisplayApi } from "@antumbra/glass-pieces/display.ts";
import type { RoleSettingsApi } from "@antumbra/glass-role-settings/glass.ts";
import type { ReactNode } from "react";
import type { VoyagesApi } from "#glass.ts";

export type VoyagesDisplayApi = VoyagesApi & PiecesDisplayApi & RoleSettingsApi & Glass<readonly [typeof agents]>["api"];
export interface VoyageDisplayActions extends PieceDisplayActions {
	readonly onHail: (voyageId: string) => void;
	readonly onSmooth: (voyageId: string) => void;
	readonly renderSpend?: ((voyageId: string) => ReactNode) | undefined;
}
