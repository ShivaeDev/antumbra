import { row } from "@antumbra/platform-feature/row.ts";
import { Artifact } from "@antumbra/platform-vocabulary/artifacts.ts";
import { Piece } from "@antumbra/platform-vocabulary/piece.ts";
import { PieceOutcome } from "@antumbra/platform-vocabulary/piece-evidence.ts";
import { Records } from "#records.ts";
export const piece = row("piece", Piece.fields, { key: "id", scope: "voyageId" });
export const pieceOutcome = row("pieceOutcome", PieceOutcome.fields, { key: "id", scope: "pieceId" });

export const artifact = row("artifact", Artifact.fields, { key: "id", scope: "pieceId" });
export const rows = Records;
