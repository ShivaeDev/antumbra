import type * as Source from "@antumbra/domain-changes/queries/quay.ts";
import { selection as quayChangeSelection } from "@antumbra/server-storage/records/quay-change.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const quay = Effect.fn("changes.quay")(function* (
	_input: Schema.Struct.Type<typeof Source.quay.input>,
): Effect.fn.Return<typeof Source.quay.output.Type, never, Records> {
	const rows = yield* Records;

	return (yield* rows.quayChange
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: quayChangeSelection })
		.pipe(Effect.orDie)).toSorted((left, right) => Date.parse(right.activityAt) - Date.parse(left.activityAt));
});
