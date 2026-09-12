import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { BoardId } from "#ids.ts";
import { type Entry, newestFirst, summaryOf } from "#queries/covered.ts";
import { boardEntry } from "#rows/board-entry.ts";

export const under = query("under", {
	input: { board: BoardId, summaryId: Schema.String },
	output: Schema.Array(boardEntry.Row),
	reads: [boardEntry],
	scope: (input) => input.board,
	run: Effect.fn("boards.under")(function* (input, rows) {
		const stored = yield* rows.boardEntry.where({ board: input.board });
		const summary = summaryOf(stored, input.summaryId);
		if (summary === undefined || summary.coversFrom === null || summary.coversTo === null) {
			return [];
		}
		const beneath: Entry[] = [];
		for (const entry of stored) {
			if (entry.register === "rough" && entry.seq >= summary.coversFrom && entry.seq <= summary.coversTo) {
				beneath.push(entry);
			}
		}
		return newestFirst(beneath);
	}),
});
