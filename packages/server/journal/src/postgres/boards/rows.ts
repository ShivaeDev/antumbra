import { row } from "@antumbra/platform-feature/row.ts";
import { BoardEntry, SmoothingAttempt, SmoothingSession } from "@antumbra/platform-vocabulary/boards.ts";
import { Piece, PieceProgress } from "@antumbra/platform-vocabulary/piece.ts";
import { Voyage } from "@antumbra/platform-vocabulary/voyage.ts";
import { Effect } from "effect";
import { rowsOf } from "#postgres/rows.ts";
import { flag } from "#postgres/settings/rows.ts";
export const piece = row("piece", Piece.fields, { key: "id", scope: "voyageId" });
export const pieceProgress = row("pieceProgress", PieceProgress.fields, { key: "id", scope: "voyageId" });
export const voyage = row("voyage", Voyage.fields, { key: "id" });
const externalpiece = rowsOf(piece, "pieces", "chartered_order");
const externalpieceProgress = rowsOf(pieceProgress, "piece_progress", "id");
const externalvoyage = rowsOf(voyage, "voyages", "opened_order");
const externalflag = rowsOf(flag, "flag");

export const boardEntry = row("boardEntry", BoardEntry.fields, { key: "id", scope: "board" });
export const smoothingAttempt = row("smoothingAttempt", SmoothingAttempt.fields, { key: "id", scope: "voyageId" });
export const smoothingSession = row("smoothingSession", SmoothingSession.fields, { key: "sessionId", scope: "attemptId" });
export const rows = Effect.gen(function* () {
	return {
		boardEntry: yield* rowsOf(boardEntry, "boardEntry", "storage_order"),
		smoothingAttempt: yield* rowsOf(smoothingAttempt, "smoothingAttempt", "storage_order"),
		smoothingSession: yield* rowsOf(smoothingSession, "smoothingSession", "storage_order"),
		piece: yield* externalpiece,
		voyage: yield* externalvoyage,
		pieceProgress: yield* externalpieceProgress,
		flag: yield* externalflag,
	};
});
