import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { PieceNotFound } from "#errors.ts";

export const verifyPieceExists = Effect.fn("Pieces.verifyExists")(function* (pieceId: string) {
	const db = yield* Database;
	const row = yield* db.Piece.where({ id: pieceId }).first();
	if (Option.isNone(row)) {
		return yield* new PieceNotFound({ pieceId });
	}
});
