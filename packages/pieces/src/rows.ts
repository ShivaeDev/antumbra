import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { PieceNotFound, VoyageNotFound } from "#errors.ts";

export const requirePiece = (pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = yield* db.Piece.where({ id: pieceId }).first();
		return Option.isNone(row)
			? yield* new PieceNotFound({ pieceId })
			: row.value;
	});

export const requireVoyage = (voyageId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = yield* db.Voyage.where({ id: voyageId }).first();
		return Option.isNone(row)
			? yield* new VoyageNotFound({ voyageId })
			: row.value;
	});
