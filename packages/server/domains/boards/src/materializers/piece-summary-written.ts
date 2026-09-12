import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { pieceSummaryWritten } from "#facts/piece-summary-written.ts";
import { boardEntry } from "#rows/board-entry.ts";

export const pieceSummaryWrittenMaterializer = materializer(pieceSummaryWritten, {
	writes: [boardEntry],
	run: Effect.fn("boards.PieceSummaryWritten")(function* (fact, rows) {
		yield* rows.boardEntry.insert({
			authorAgentId: fact.authorAgentId,
			board: fact.board,
			body: fact.body,
			coversFrom: null,
			coversTo: null,
			createdAt: new Date(fact.at).toISOString(),
			id: fact.id,
			kind: "pieceSummary",
			level: null,
			pieceId: fact.pieceId,
			register: "rough",
			seq: fact.number,
		});
	}),
});
