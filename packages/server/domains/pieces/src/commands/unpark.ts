import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { pieceUnparked } from "#facts/piece-unparked.ts";
import { PieceId } from "#ids.ts";
import { piece } from "#rows/piece.ts";

export const unpark = command("unpark", {
	input: { id: PieceId },
	reads: [piece],
	emits: pieceUnparked,
	rejections: { Unknown: { id: Schema.String } },
	run: Effect.fn("pieces.unpark")(function* (input, rows, reject) {
		if (!(yield* rows.piece.exists(input.id))) {
			return yield* reject.Unknown({ id: input.id });
		}
		return { id: input.id };
	}),
});
