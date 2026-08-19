import { Database, type PrismaError } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { PieceNotFound, VoyageNotFound } from "#errors.ts";
import type { PiecesReturn } from "#requirements.ts";

export const verifyPieceExists = Effect.fn("pieces.verifyPieceExists")(
	function* (pieceId: string): PiecesReturn<void, PieceNotFound | PrismaError> {
		const db = yield* Database;
		const row = yield* db.Piece.where({ id: pieceId }).first();
		if (Option.isNone(row)) {
			return yield* new PieceNotFound({ pieceId });
		}
	},
);

export const verifyVoyageExists = (voyageId: string) =>
	Effect.gen(function* (): PiecesReturn<void, VoyageNotFound | PrismaError> {
		const db = yield* Database;
		const row = yield* db.Voyage.where({ id: voyageId }).first();
		if (Option.isNone(row)) {
			return yield* new VoyageNotFound({ voyageId });
		}
	});
