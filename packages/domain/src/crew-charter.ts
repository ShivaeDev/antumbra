import { BoardScope, Boards, smoothBodies } from "@antumbra/boards";
import { crewCharter } from "@antumbra/prompts";
import { Effect, Option } from "effect";
import { rulingLine, standingRulingsFor } from "#standing-rulings.ts";
import type { PieceRow, VoyageRow } from "#voyage-rows.ts";

// why: the boards and the standing rulings are read at the moment crew is
// asked for rather than inside the pure composer — what a piece is told at
// birth is a fact about when it was dispatched. The dispatcher's own pass and
// an admiral asking for a piece by name compose the same charter, so crew is
// told the same thing either way.
export const charterFor = (piece: PieceRow, voyage: VoyageRow, agentId: string) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const voyageSmoothLog = yield* boards.read(BoardScope.Voyage({ voyageId: voyage.id })).pipe(Effect.map(smoothBodies));
		const pieceSmoothLog = yield* boards.read(BoardScope.Piece({ pieceId: piece.id })).pipe(Effect.map(smoothBodies));
		const standing = yield* standingRulingsFor({
			agentId,
			pieceId: Option.some(piece.id),
			voyageId: Option.some(voyage.id),
		});
		return crewCharter({
			context: voyage.context,
			expectation: piece.expectation,
			northStar: voyage.northStar,
			pieceCharter: piece.charter,
			pieceLog: pieceSmoothLog,
			pieceTitle: piece.title,
			rulings: standing.map(rulingLine),
			voyageLog: voyageSmoothLog,
		});
	});
