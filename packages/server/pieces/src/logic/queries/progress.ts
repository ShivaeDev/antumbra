import type * as Source from "@antumbra/domain-pieces/queries/progress.ts";
import { selection as pieceProgressSelection } from "@antumbra/server-storage/records/piece-progress.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";

export const progress = Effect.fn("pieces.progress")(function* (
	input: Schema.Struct.Type<typeof Source.progress.input>,
): Effect.fn.Return<typeof Source.progress.output.Type, never, Records> {
	const rows = yield* Records;

	return Option.getOrNull(
		yield* rows.pieceProgress
			.findOne({ where: { id: input.id }, orderBy: { field: "id", direction: "asc" }, select: pieceProgressSelection })
			.pipe(Effect.orDie),
	);
});
