import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { summarize } from "#commands/summarize.ts";
import { summarizePiece } from "#commands/summarize-piece.ts";
import { write } from "#commands/write.ts";
import { noteWritten } from "#facts/note-written.ts";
import { pieceSummaryWritten } from "#facts/piece-summary-written.ts";
import { summaryWritten } from "#facts/summary-written.ts";
import { noteWrittenMaterializer } from "#materializers/note-written.ts";
import { pieceSummaryWrittenMaterializer } from "#materializers/piece-summary-written.ts";
import { summaryWrittenMaterializer } from "#materializers/summary-written.ts";
import { digest } from "#queries/digest.ts";
import { entries } from "#queries/entries.ts";
import { under } from "#queries/under.ts";
import { boardEntry } from "#rows/board-entry.ts";

export const boards = feature("boards", {
	rows: [boardEntry, piece, voyage],
	facts: [noteWritten, summaryWritten, pieceSummaryWritten],
	commands: [write, summarize, summarizePiece],
	materializers: [noteWrittenMaterializer, summaryWrittenMaterializer, pieceSummaryWrittenMaterializer],
	queries: [entries, digest, under],
});
