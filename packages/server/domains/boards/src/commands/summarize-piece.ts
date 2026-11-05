import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { BoardId } from "@antumbra/platform-vocabulary/board-ids.ts";
import { Schema } from "effect";
import { pieceSummaryWritten } from "#facts/piece-summary-written.ts";
import { boardEntry } from "#rows/board-entry.ts";

export const summarizePiece = command("summarizePiece", {
	input: { board: BoardId, author: Schema.String, body: Schema.String, pieceId: PieceId },
	reads: [boardEntry],
	emits: pieceSummaryWritten,
	rejections: { Blank: { field: Schema.String, message: Schema.String } },
});
