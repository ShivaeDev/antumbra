import type * as Source from "@antumbra/domain-reclamation/queries/berths.ts";
import { selection as berthSelection } from "@antumbra/server-storage/records/berth.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const berths = Effect.fn("Reclamation.berths")(function* (
	input: Schema.Struct.Type<typeof Source.berths.input>,
): Effect.fn.Return<typeof Source.berths.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.berth
		.findMany({ where: input, orderBy: { field: "storage_order", direction: "asc" }, select: berthSelection })
		.pipe(Effect.orDie);
});
