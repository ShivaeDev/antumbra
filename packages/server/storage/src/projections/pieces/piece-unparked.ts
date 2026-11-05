import type { pieceUnparked } from "@antumbra/domain-pieces/facts/piece-unparked.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const pieceUnparkedMaterializer = Effect.fn("pieces.PieceUnparked")(function* (
	fact: FactValue<typeof pieceUnparked>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.piece.updateVoid({ ...{ parkedAt: null }, id: fact.id }).pipe(Effect.orDie);
});
