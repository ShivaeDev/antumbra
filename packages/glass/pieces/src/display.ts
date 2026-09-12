import type { agents } from "@antumbra/domain-agents/feature.ts";
import type { rulings } from "@antumbra/domain-rulings/feature.ts";
import type { ArtifactsApi, ReadArtifact } from "@antumbra/glass-artifacts/glass.ts";
import type { BoardDisplayApi } from "@antumbra/glass-boards/display.ts";
import type { ChangesApi } from "@antumbra/glass-changes/glass.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";
import type { ReportsApi } from "@antumbra/glass-reports/glass.ts";
import type { PiecesApi } from "#glass.ts";

export type PiecesDisplayApi = PiecesApi &
	BoardDisplayApi &
	ArtifactsApi &
	ReportsApi &
	ChangesApi &
	Glass<readonly [typeof agents, typeof rulings]>["api"];
export interface PieceDisplayActions {
	readonly readArtifact: ReadArtifact;
	readonly openArtifact: (id: string) => void;
	readonly onWorkNow: (pieceId: string) => void;
	readonly onRetireCrew: (pieceId: string) => void;
}
