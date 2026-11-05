import type { pieceParked } from "@antumbra/domain-pieces/facts/piece-parked.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const pieceParkedMaterializer = Effect.fn("pieces.PieceParked")(function* (
	fact: FactValue<typeof pieceParked>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.piece.updateVoid({ ...{ parkedAt: fact.parkedAt }, id: fact.id }).pipe(Effect.orDie);
});
