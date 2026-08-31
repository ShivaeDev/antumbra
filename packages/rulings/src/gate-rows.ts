import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { RulingGatePieceMissing } from "#errors.ts";

export const requirePiece = (pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		if (!(yield* db.Piece.where({ id: pieceId }).exists())) {
			return yield* new RulingGatePieceMissing({ pieceId });
		}
	});

export const appendGate = (rulingId: string, pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.RulingGate.create({
			id: crypto.randomUUID(),
			pieceId,
			rulingId,
		});
	});
