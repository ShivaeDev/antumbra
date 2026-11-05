import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { pieceLaunched } from "#facts/piece-launched.ts";
import { PieceId } from "#ids.ts";
import { piece } from "#rows/piece.ts";

export const launch = command("launch", {
	input: { id: PieceId },
	reads: [piece],
	emits: pieceLaunched,
	rejections: { Unknown: { id: Schema.String } },
});
