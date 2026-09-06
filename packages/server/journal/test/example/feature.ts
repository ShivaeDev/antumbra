import { feature } from "@antumbra/journal";
import { park } from "#example/commands/park.ts";
import { pieceParked } from "#example/facts/piece-parked.ts";
import { pieceParkedMaterializer } from "#example/materializers/piece-parked.ts";
import { byVoyage } from "#example/queries/by-voyage.ts";
import { piece } from "#example/rows/piece.ts";

export const pieces = feature("pieces", {
	rows: [piece],
	facts: [pieceParked],
	commands: [park],
	materializers: [pieceParkedMaterializer],
	queries: [byVoyage],
});
