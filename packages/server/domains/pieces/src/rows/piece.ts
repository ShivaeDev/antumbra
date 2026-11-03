import { row } from "@antumbra/platform-feature/row.ts";
import { Piece } from "@antumbra/platform-vocabulary/piece.ts";

export const piece = row("piece", Piece.fields, { key: "id", scope: "voyageId" });
