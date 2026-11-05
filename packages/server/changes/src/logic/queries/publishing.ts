import type * as Source from "@antumbra/domain-changes/queries/publishing.ts";
import { selection as changeSelection } from "@antumbra/server-storage/records/change.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const publishing = Effect.fn("changes.publishing")(function* (
	_input: Schema.Struct.Type<typeof Source.publishing.input>,
): Effect.fn.Return<typeof Source.publishing.output.Type, never, Records> {
	const rows = yield* Records;

	return (yield* rows.change
		.findMany({ where: { stage: "prepared" }, orderBy: { field: "storage_order", direction: "asc" }, select: changeSelection })
		.pipe(Effect.orDie)).filter((row) => row.proposalFrozenAt !== null && row.publicationRequestId !== null && row.publicationError === null);
});
