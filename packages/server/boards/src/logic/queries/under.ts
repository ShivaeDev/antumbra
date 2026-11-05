import { type Entry, newestFirst, summaryOf } from "@antumbra/domain-boards/queries/covered.ts";
import type * as Source from "@antumbra/domain-boards/queries/under.ts";
import { selection as boardEntrySelection } from "@antumbra/server-storage/records/board-entry.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const under = Effect.fn("boards.under")(function* (
	input: Schema.Struct.Type<typeof Source.under.input>,
): Effect.fn.Return<typeof Source.under.output.Type, never, Records> {
	const rows = yield* Records;

	const stored = yield* rows.boardEntry
		.findMany({ where: { board: input.board }, orderBy: { field: "storage_order", direction: "asc" }, select: boardEntrySelection })
		.pipe(Effect.orDie);
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
});
