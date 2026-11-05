import type * as Source from "@antumbra/domain-changes/queries/all.ts";
import { selection as changeSelection } from "@antumbra/server-storage/records/change.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const all = Effect.fn("changes.all")(function* (
	_input: Schema.Struct.Type<typeof Source.all.input>,
): Effect.fn.Return<typeof Source.all.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.change
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeSelection })
		.pipe(Effect.orDie);
});
