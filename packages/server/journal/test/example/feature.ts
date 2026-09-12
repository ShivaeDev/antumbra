import { feature } from "@antumbra/platform-feature/feature.ts";
import { park } from "#example/commands/park.ts";
import { pieceChartered } from "#example/facts/piece-chartered.ts";
import { pieceParked } from "#example/facts/piece-parked.ts";
import { pieceCharteredMaterializer } from "#example/materializers/piece-chartered.ts";
import { pieceParkedMaterializer } from "#example/materializers/piece-parked.ts";
import { byVoyage } from "#example/queries/by-voyage.ts";
import { piece } from "#example/rows/piece.ts";

export const pieces = feature("pieces", {
	rows: [piece],
	facts: [pieceChartered, pieceParked],
	commands: [park],
	materializers: [pieceCharteredMaterializer, pieceParkedMaterializer],
	queries: [byVoyage],
});
