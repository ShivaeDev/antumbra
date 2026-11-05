import type { pieceVerdictLanded } from "@antumbra/domain-pieces/facts/piece-verdict-landed.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const pieceVerdictLandedMaterializer = Effect.fn("pieces.PieceVerdictLanded")(function* (
	fact: FactValue<typeof pieceVerdictLanded>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.piece.updateVoid({ ...{ verdict: fact.verdict }, id: fact.id }).pipe(Effect.orDie);
});
