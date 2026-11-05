import { command } from "@antumbra/platform-feature/command.ts";
import { PieceVerdict } from "@antumbra/platform-vocabulary/verdict.ts";
import { Schema } from "effect";
import { pieceVerdictLanded } from "#facts/piece-verdict-landed.ts";
import { PieceId } from "#ids.ts";
import { piece } from "#rows/piece.ts";

export const landVerdict = command("landVerdict", {
	input: { id: PieceId, verdict: PieceVerdict },
	reads: [piece],
	emits: pieceVerdictLanded,
	rejections: { Unknown: { id: Schema.String } },
});
