import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { pieceParked } from "#facts/piece-parked.ts";
import { PieceId } from "#ids.ts";
import { piece } from "#rows/piece.ts";

export const park = command("park", {
	input: { id: PieceId },
	reads: [piece],
	emits: pieceParked,
	rejections: { Unknown: { id: Schema.String } },
});
