import { query } from "@antumbra/platform-feature/query.ts";
import { BoardId } from "@antumbra/platform-vocabulary/board-ids.ts";
import { Effect, Schema } from "effect";
import { covered, type Entry, newestFirst } from "#queries/covered.ts";
import { boardEntry } from "#rows/board-entry.ts";

export const digest = query("digest", {
	input: { board: BoardId },
	output: Schema.Array(boardEntry.Row),
	reads: [boardEntry],
	scope: (input) => input.board,
	run: Effect.fn("boards.digest")(function* (input, rows) {
		const stored = yield* rows.boardEntry.where({ board: input.board });
		const standing: Entry[] = [];
		for (const entry of stored) {
			if (!covered(stored, entry)) {
				standing.push(entry);
			}
		}
		return newestFirst(standing);
	}),
});
