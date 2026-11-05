import type * as Source from "@antumbra/domain-agents/queries/births.ts";
import { selection as birthSelection } from "@antumbra/server-storage/records/birth.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const births = Effect.fn("Agents.births")(function* (
	_input: Schema.Struct.Type<typeof Source.births.input>,
): Effect.fn.Return<typeof Source.births.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.birth.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: birthSelection }).pipe(Effect.orDie);
});
