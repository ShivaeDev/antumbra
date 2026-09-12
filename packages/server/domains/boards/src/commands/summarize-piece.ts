import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { BODY, nextSequence, SUMMARY_NEEDS_BODY } from "#commands/board.ts";
import { pieceSummaryWritten } from "#facts/piece-summary-written.ts";
import { BoardEntryId, BoardId } from "#ids.ts";
import { boardEntry } from "#rows/board-entry.ts";

export const summarizePiece = command("summarizePiece", {
	input: { board: BoardId, author: Schema.String, body: Schema.String, pieceId: PieceId },
	reads: [boardEntry],
	emits: pieceSummaryWritten,
	rejections: { Blank: { field: Schema.String, message: Schema.String } },
	run: Effect.fn("boards.summarizePiece")(function* (input, rows, reject) {
		const body = input.body.trim();
		if (body === "") {
			return yield* reject.Blank({ field: BODY, message: SUMMARY_NEEDS_BODY });
		}
		return {
			authorAgentId: input.author,
			board: input.board,
			body,
			id: BoardEntryId.make(input.requestId),
			number: yield* nextSequence(rows, input.board),
			pieceId: input.pieceId,
		};
	}),
});
