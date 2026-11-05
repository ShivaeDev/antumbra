import type * as Source from "@antumbra/domain-inputs/queries/pending.ts";
import { selection as sessionInputSelection } from "@antumbra/server-storage/records/session-input.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const pending = Effect.fn("inputs.pending")(function* (
	_input: Schema.Struct.Type<typeof Source.pending.input>,
): Effect.fn.Return<typeof Source.pending.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.sessionInput
		.findMany({ where: { status: "pending" }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionInputSelection })
		.pipe(Effect.orDie);
});
