import { BoardScope, Boards, entryBodies } from "@antumbra/boards";
import { crewCharter } from "@antumbra/prompts";
import { Effect, Option } from "effect";
import { rulingLine, standingRulingsFor } from "#standing-rulings.ts";
import type { PieceRow, VoyageRow } from "#voyage-rows.ts";

export const charterFor = (piece: PieceRow, voyage: VoyageRow, agentId: string) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const voyageLog = yield* boards.read(BoardScope.Voyage({ voyageId: voyage.id })).pipe(Effect.map(entryBodies));
		const pieceLog = yield* boards.read(BoardScope.Piece({ pieceId: piece.id })).pipe(Effect.map(entryBodies));
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
			pieceLog,
			pieceTitle: piece.title,
			rulings: standing.map(rulingLine),
			voyageLog,
		});
	});
