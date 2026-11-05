import type * as Source from "@antumbra/domain-inputs/queries/reading.ts";
import { selection as sessionInputSelection } from "@antumbra/server-storage/records/session-input.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";
export const reading = Effect.fn("inputs.reading")(function* (
	input: Schema.Struct.Type<typeof Source.reading.input>,
): Effect.fn.Return<typeof Source.reading.output.Type, never, Records> {
	const rows = yield* Records;

	const held = yield* rows.sessionInput
		.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionInputSelection })
		.pipe(Effect.orDie);
	return Option.isSome(held) && held.value.sessionId === input.sessionId ? held.value : null;
});
