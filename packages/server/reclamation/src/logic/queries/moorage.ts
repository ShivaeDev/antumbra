import type * as Source from "@antumbra/domain-reclamation/queries/moorage.ts";
import { selection as moorageSelection } from "@antumbra/server-storage/records/moorage.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const current = Effect.fn("Reclamation.current")(function* (
	input: Schema.Struct.Type<typeof Source.current.input>,
): Effect.fn.Return<typeof Source.current.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.moorage
		.findOne({ where: { agentId: input.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: moorageSelection })
		.pipe(Effect.orDie);
});
