import { query } from "@antumbra/platform-feature/query.ts";
import { BoardId } from "@antumbra/platform-vocabulary/board-ids.ts";
import { Schema } from "effect";
import { boardEntry } from "#rows/board-entry.ts";

export const entries = query("entries", {
	input: { board: BoardId },
	output: Schema.Array(boardEntry.Row),
	reads: [boardEntry],
	scope: (input) => input.board,
});
