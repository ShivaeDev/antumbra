import type * as Source from "@antumbra/domain-changes/queries/adoptions.ts";
import { selection as changeAdoptionRequestSelection } from "@antumbra/server-storage/records/change-adoption-request.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const adoptions = Effect.fn("changes.adoptions")(function* (
	_input: Schema.Struct.Type<typeof Source.adoptions.input>,
): Effect.fn.Return<typeof Source.adoptions.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.changeAdoptionRequest
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeAdoptionRequestSelection })
		.pipe(Effect.orDie);
});
