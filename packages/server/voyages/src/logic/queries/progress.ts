import type * as Source from "@antumbra/domain-voyages/queries/progress.ts";
import { selection as voyageProgressSelection } from "@antumbra/server-storage/records/voyage-progress.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";

export const progress = Effect.fn("voyages.progress")(function* (
	input: Schema.Struct.Type<typeof Source.progress.input>,
): Effect.fn.Return<typeof Source.progress.output.Type, never, Records> {
	const rows = yield* Records;

	return Option.getOrNull(
		yield* rows.voyageProgress
			.findOne({ where: { id: input.id }, orderBy: { field: "id", direction: "asc" }, select: voyageProgressSelection })
			.pipe(Effect.orDie),
	);
});
