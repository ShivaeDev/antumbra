import { inOrder } from "@antumbra/domain-boards/queries/covered.ts";
import type * as Source from "@antumbra/domain-boards/queries/entries.ts";
import { selection as boardEntrySelection } from "@antumbra/server-storage/records/board-entry.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const entries = Effect.fn("boards.entries")(function* (
	input: Schema.Struct.Type<typeof Source.entries.input>,
): Effect.fn.Return<typeof Source.entries.output.Type, never, Records> {
	const rows = yield* Records;

	return inOrder(
		yield* rows.boardEntry
			.findMany({ where: { board: input.board }, orderBy: { field: "storage_order", direction: "asc" }, select: boardEntrySelection })
			.pipe(Effect.orDie),
	);
});
