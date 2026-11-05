import type * as Source from "@antumbra/domain-changes/queries/links.ts";
import { selection as pieceChangeSelection } from "@antumbra/server-storage/records/piece-change.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const links = Effect.fn("changes.links")(function* (
	_input: Schema.Struct.Type<typeof Source.links.input>,
): Effect.fn.Return<typeof Source.links.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.pieceChange
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: pieceChangeSelection })
		.pipe(Effect.orDie);
});
