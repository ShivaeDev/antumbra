import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { summaryWritten } from "#facts/summary-written.ts";
import { boardEntry } from "#rows/board-entry.ts";

export const summaryWrittenMaterializer = materializer(summaryWritten, {
	writes: [boardEntry],
	run: Effect.fn("boards.SummaryWritten")(function* (fact, rows) {
		yield* rows.boardEntry.insert({
			authorAgentId: fact.authorAgentId,
			board: fact.board,
			body: fact.body,
			coversFrom: fact.coversFrom,
			coversTo: fact.coversTo,
			createdAt: new Date(fact.at).toISOString(),
			id: fact.id,
			kind: "summary",
			level: fact.level,
			pieceId: null,
			register: "smooth",
			seq: fact.number,
		});
	}),
});
