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

// why: naming a piece twice is the same demand said twice, so a second naming
// finds the row the first one landed rather than hanging a second hold.
export const appendGate = (rulingId: string, pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const held = yield* db.RulingGate.where({ pieceId, rulingId }).exists();
		if (!held) {
			yield* db.RulingGate.create({
				id: crypto.randomUUID(),
				pieceId,
				rulingId,
			});
		}
	});
