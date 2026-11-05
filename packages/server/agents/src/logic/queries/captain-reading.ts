import type * as Source from "@antumbra/domain-agents/queries/captain-reading.ts";
import { selection as captainReadingSelection } from "@antumbra/server-storage/records/captain-reading.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";
export const captain = Effect.fn("Agents.captainReading")(function* (
	input: Schema.Struct.Type<typeof Source.captain.input>,
): Effect.fn.Return<typeof Source.captain.output.Type, never, Records> {
	const rows = yield* Records;

	return Option.getOrNull(
		yield* rows.captainReading
			.findOne({ where: { voyageId: input.voyageId }, orderBy: { field: "storage_order", direction: "asc" }, select: captainReadingSelection })
			.pipe(Effect.orDie),
	);
});
