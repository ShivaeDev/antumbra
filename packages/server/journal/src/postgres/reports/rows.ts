import { row } from "@antumbra/platform-feature/row.ts";
import { Piece } from "@antumbra/platform-vocabulary/piece.ts";
import { PieceOutcome } from "@antumbra/platform-vocabulary/piece-evidence.ts";
import { PieceReport, Report } from "@antumbra/platform-vocabulary/reports.ts";
import { Effect } from "effect";
import { rowsOf } from "#postgres/rows.ts";
export const piece = row("piece", Piece.fields, { key: "id", scope: "voyageId" });
export const pieceOutcome = row("pieceOutcome", PieceOutcome.fields, { key: "id", scope: "pieceId" });
const externalpiece = rowsOf(piece, "pieces", "chartered_order");
const externalpieceOutcome = rowsOf(pieceOutcome, "piece_outcomes", "id");

export const report = row("report", Report.fields, { key: "id" });
export const pieceReport = row("pieceReport", PieceReport.fields, { key: "id", scope: "pieceId" });
export const rows = Effect.gen(function* () {
	return {
		report: yield* rowsOf(report, "report", "storage_order"),
		pieceReport: yield* rowsOf(pieceReport, "pieceReport", "storage_order"),
		piece: yield* externalpiece,
		pieceOutcome: yield* externalpieceOutcome,
	};
});
