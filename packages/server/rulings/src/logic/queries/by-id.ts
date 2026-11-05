import type * as Source from "@antumbra/domain-rulings/queries/by-id.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const byId = Effect.fn("rulings.byId")(function* (
	input: Schema.Struct.Type<typeof Source.byId.input>,
): Effect.fn.Return<typeof Source.byId.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.ruling
		.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie);
});
