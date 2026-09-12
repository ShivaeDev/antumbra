import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { BoardId } from "#ids.ts";
import { inOrder } from "#queries/covered.ts";
import { boardEntry } from "#rows/board-entry.ts";

export const entries = query("entries", {
	input: { board: BoardId },
	output: Schema.Array(boardEntry.Row),
	reads: [boardEntry],
	scope: (input) => input.board,
	run: Effect.fn("boards.entries")(function* (input, rows) {
		return inOrder(yield* rows.boardEntry.where({ board: input.board }));
	}),
});
