import type * as Source from "@antumbra/domain-reclamation/queries/claims.ts";
import { selection as berthSelection } from "@antumbra/server-storage/records/berth.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const claims = Effect.fn("Reclamation.claims")(function* (
	_input: Schema.Struct.Type<typeof Source.claims.input>,
): Effect.fn.Return<typeof Source.claims.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.berth
		.findMany({ where: { reclaimState: "claimed" }, orderBy: { field: "storage_order", direction: "asc" }, select: berthSelection })
		.pipe(Effect.orDie);
});
