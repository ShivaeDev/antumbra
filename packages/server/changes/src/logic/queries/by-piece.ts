import type * as Source from "@antumbra/domain-changes/queries/by-piece.ts";
import { selection as pieceChangeViewSelection } from "@antumbra/server-storage/records/piece-change-view.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const byPiece = Effect.fn("changes.byPiece")(function* (
	input: Schema.Struct.Type<typeof Source.byPiece.input>,
): Effect.fn.Return<typeof Source.byPiece.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.pieceChangeView
		.findMany({ where: input, orderBy: { field: "storage_order", direction: "asc" }, select: pieceChangeViewSelection })
		.pipe(Effect.orDie);
});
