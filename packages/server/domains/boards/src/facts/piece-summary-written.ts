import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { BoardEntryId, BoardId } from "#ids.ts";
import { Sequence } from "#rows/board-entry.ts";

export const pieceSummaryWritten = fact("PieceSummaryWritten", {
	id: BoardEntryId,
	board: BoardId,
	number: Sequence,
	authorAgentId: Schema.String,
	body: Schema.String,
	pieceId: PieceId,
});
