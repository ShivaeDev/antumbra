import { fact } from "@antumbra/platform-feature/fact.ts";
import { SummaryLevelSchema } from "@antumbra/platform-vocabulary/board.ts";
import { Schema } from "effect";
import { BoardEntryId, BoardId } from "#ids.ts";
import { Sequence } from "#rows/board-entry.ts";

export const summaryWritten = fact("SummaryWritten", {
	id: BoardEntryId,
	board: BoardId,
	number: Sequence,
	authorAgentId: Schema.String,
	body: Schema.String,
	coversFrom: Sequence,
	coversTo: Sequence,
	level: SummaryLevelSchema,
});
