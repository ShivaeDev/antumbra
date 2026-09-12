import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Effect, Option } from "effect";
import { RulingGatePieceMissing } from "#errors.ts";

export const requirePiece = Effect.fnUntraced(function* (pieceId: string) {
	const pieces = yield* Pieces;
	if (Option.isNone(yield* pieces.byId(pieceId))) {
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
