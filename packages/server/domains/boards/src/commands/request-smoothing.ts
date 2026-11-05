import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { smoothingRequested } from "#facts/smoothing-requested.ts";

const { voyageId, pieceId, throughToday, by } = smoothingRequested.payload;
export const requestSmoothing = command("requestSmoothing", {
	input: { voyageId, pieceId, throughToday, by },
	reads: [voyage, piece],
	emits: smoothingRequested,
	rejections: { UnknownVoyage: { id: Schema.String }, WrongPiece: { id: Schema.String } },
});
