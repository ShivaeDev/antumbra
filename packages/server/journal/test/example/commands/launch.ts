import { command } from "@antumbra/platform-feature/command.ts";
import { Effect } from "effect";
import { pieceLaunched } from "#example/facts/piece-launched.ts";
import { PieceId } from "#example/ids.ts";
import { piece } from "#example/rows/piece.ts";

export const launch = command("launch", {
	input: { pieceId: PieceId },
	reads: [piece],
	emits: pieceLaunched,
	rejections: { PieceNotFound: { pieceId: PieceId } },
	run: Effect.fn("pieces.launch")(function* (input, rows, reject) {
		if (!(yield* rows.piece.exists(input.pieceId))) return yield* reject.PieceNotFound({ pieceId: input.pieceId });
		return { pieceId: input.pieceId };
	}),
});
