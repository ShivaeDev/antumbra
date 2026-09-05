import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { pieceVerdictRow } from "#verdict-rows.ts";

export const verdicts = Effect.fn("Pieces.verdicts")(function* (pieceIds: ReadonlyArray<string>) {
	const db = yield* Database;
	return new Map(yield* Effect.forEach(yield* db.PieceVerdict.where((row) => row.pieceId.in(pieceIds)).all(), pieceVerdictRow));
});
