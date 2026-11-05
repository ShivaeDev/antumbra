import type { pieceSummaryWritten } from "@antumbra/domain-boards/facts/piece-summary-written.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const pieceSummaryWrittenMaterializer = Effect.fn("boards.PieceSummaryWritten")(function* (
	fact: FactValue<typeof pieceSummaryWritten>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.boardEntry
		.insertVoid({
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
		})
		.pipe(Effect.orDie);
});
