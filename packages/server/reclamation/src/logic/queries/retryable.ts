import type * as Source from "@antumbra/domain-reclamation/queries/retryable.ts";
import { selection as berthSelection } from "@antumbra/server-storage/records/berth.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const retryable = Effect.fn("Reclamation.retryable")(function* (
	_input: Schema.Struct.Type<typeof Source.retryable.input>,
): Effect.fn.Return<typeof Source.retryable.output.Type, never, Records> {
	const rows = yield* Records;

	return (yield* rows.berth
		.findMany({ where: { reclaimState: "claimed" }, orderBy: { field: "storage_order", direction: "asc" }, select: berthSelection })
		.pipe(Effect.orDie)).filter((site) => site.reclaimResult !== null);
});
