import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { RulingGatePieceMissing } from "#errors.ts";

export const requirePiece = Effect.fnUntraced(function* (pieceId: string) {
	const db = yield* Database;
	if (!(yield* db.Piece.where({ id: pieceId }).exists())) {
		return yield* new RulingGatePieceMissing({ pieceId });
	}
});

export const appendGate = Effect.fnUntraced(function* (rulingId: string, pieceId: string) {
	const db = yield* Database;
	yield* db.RulingGate.create({
		id: crypto.randomUUID(),
		pieceId,
		rulingId,
	});
});
