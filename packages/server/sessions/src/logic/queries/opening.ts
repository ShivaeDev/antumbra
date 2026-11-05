import type * as Source from "@antumbra/domain-sessions/queries/opening.ts";
import { selection as sessionOpeningSelection } from "@antumbra/server-storage/records/session-opening.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";

export const opening = Effect.fn("Sessions.opening")(function* (
	input: Schema.Struct.Type<typeof Source.opening.input>,
): Effect.fn.Return<typeof Source.opening.output.Type, never, Records> {
	const rows = yield* Records;

	return Option.getOrNull(
		yield* rows.sessionOpening
			.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionOpeningSelection })
			.pipe(Effect.orDie),
	);
});
