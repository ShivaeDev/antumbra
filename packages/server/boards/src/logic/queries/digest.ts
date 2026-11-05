import { covered, type Entry, newestFirst } from "@antumbra/domain-boards/queries/covered.ts";
import type * as Source from "@antumbra/domain-boards/queries/digest.ts";
import { selection as boardEntrySelection } from "@antumbra/server-storage/records/board-entry.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const digest = Effect.fn("boards.digest")(function* (
	input: Schema.Struct.Type<typeof Source.digest.input>,
): Effect.fn.Return<typeof Source.digest.output.Type, never, Records> {
	const rows = yield* Records;

	const stored = yield* rows.boardEntry
		.findMany({ where: { board: input.board }, orderBy: { field: "storage_order", direction: "asc" }, select: boardEntrySelection })
		.pipe(Effect.orDie);
	const standing: Entry[] = [];
	for (const entry of stored) {
		if (!covered(stored, entry)) {
			standing.push(entry);
		}
	}
	return newestFirst(standing);
});
