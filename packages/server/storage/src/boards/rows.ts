import { row } from "@antumbra/platform-feature/row.ts";
import { BoardEntry, SmoothingAttempt, SmoothingSession } from "@antumbra/platform-vocabulary/boards.ts";
import { Piece, PieceProgress } from "@antumbra/platform-vocabulary/piece.ts";
import { Voyage } from "@antumbra/platform-vocabulary/voyage.ts";
import { Records } from "#records.ts";
export const piece = row("piece", Piece.fields, { key: "id", scope: "voyageId" });
export const pieceProgress = row("pieceProgress", PieceProgress.fields, { key: "id", scope: "voyageId" });
export const voyage = row("voyage", Voyage.fields, { key: "id" });

export const boardEntry = row("boardEntry", BoardEntry.fields, { key: "id", scope: "board" });
export const smoothingAttempt = row("smoothingAttempt", SmoothingAttempt.fields, { key: "id", scope: "voyageId" });
export const smoothingSession = row("smoothingSession", SmoothingSession.fields, { key: "sessionId", scope: "attemptId" });
export const rows = Records;
