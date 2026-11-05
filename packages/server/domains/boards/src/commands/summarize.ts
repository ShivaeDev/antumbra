import { command } from "@antumbra/platform-feature/command.ts";
import { SummaryLevelSchema } from "@antumbra/platform-vocabulary/board.ts";
import { BoardId } from "@antumbra/platform-vocabulary/board-ids.ts";
import { Sequence } from "@antumbra/platform-vocabulary/boards.ts";
import { Schema } from "effect";
import { summaryWritten } from "#facts/summary-written.ts";
import { boardEntry } from "#rows/board-entry.ts";

export const summarize = command("summarize", {
	input: {
		board: BoardId,
		author: Schema.String,
		body: Schema.String,
		coversFrom: Sequence,
		coversTo: Sequence,
		level: SummaryLevelSchema,
	},
	reads: [boardEntry],
	emits: summaryWritten,
	rejections: { Blank: { field: Schema.String, message: Schema.String } },
});
