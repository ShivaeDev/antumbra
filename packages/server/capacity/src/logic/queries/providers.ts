import type * as Source from "@antumbra/domain-capacity/queries/providers.ts";
import { selection as capacitySelection } from "@antumbra/server-storage/records/capacity.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const providers = Effect.fn("capacity.providers")(function* (
	_input: Schema.Struct.Type<typeof Source.providers.input>,
): Effect.fn.Return<typeof Source.providers.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.capacity
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: capacitySelection })
		.pipe(Effect.orDie);
});
