import { command } from "@antumbra/platform-feature/command.ts";
import { PieceVerdict } from "@antumbra/platform-vocabulary/verdict.ts";
import { Effect, Schema } from "effect";
import { pieceVerdictLanded } from "#facts/piece-verdict-landed.ts";
import { PieceId } from "#ids.ts";
import { piece } from "#rows/piece.ts";

export const landVerdict = command("landVerdict", {
	input: { id: PieceId, verdict: PieceVerdict },
	reads: [piece],
	emits: pieceVerdictLanded,
	rejections: { Unknown: { id: Schema.String } },
	run: Effect.fn("pieces.landVerdict")(function* (input, rows, reject) {
		if (!(yield* rows.piece.exists(input.id))) {
			return yield* reject.Unknown({ id: input.id });
		}
		return { id: input.id, verdict: input.verdict };
	}),
});
