import { row } from "@antumbra/platform-feature/row.ts";
import { VoyagePieceProgress } from "@antumbra/platform-vocabulary/piece.ts";

export const voyagePieceProgress = row("voyagePieceProgress", VoyagePieceProgress.fields, { key: "id", scope: "voyageId" });
