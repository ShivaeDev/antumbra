import { query } from "@antumbra/platform-feature/query.ts";
import { BoardId } from "@antumbra/platform-vocabulary/board-ids.ts";
import { Schema } from "effect";
import { boardEntry } from "#rows/board-entry.ts";

export const under = query("under", {
	input: { board: BoardId, summaryId: Schema.String },
	output: Schema.Array(boardEntry.Row),
	reads: [boardEntry],
	scope: (input) => input.board,
});
