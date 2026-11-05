import type { summaryWritten } from "@antumbra/domain-boards/facts/summary-written.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const summaryWrittenMaterializer = Effect.fn("boards.SummaryWritten")(function* (
	fact: FactValue<typeof summaryWritten>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.boardEntry
		.insertVoid({
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
		})
		.pipe(Effect.orDie);
});
