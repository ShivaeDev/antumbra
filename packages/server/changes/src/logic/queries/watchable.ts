import type * as Source from "@antumbra/domain-changes/queries/watchable.ts";
import { selection as changeSelection } from "@antumbra/server-storage/records/change.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const watchable = Effect.fn("changes.watchable")(function* (
	_input: Schema.Struct.Type<typeof Source.watchable.input>,
): Effect.fn.Return<typeof Source.watchable.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.change
		.findMany({ where: { stage: "open" }, orderBy: { field: "storage_order", direction: "asc" }, select: changeSelection })
		.pipe(Effect.orDie);
});
