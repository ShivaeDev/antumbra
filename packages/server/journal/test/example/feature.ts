import { feature } from "@antumbra/platform-feature/feature.ts";
import { charter } from "#example/commands/charter.ts";
import { launch } from "#example/commands/launch.ts";
import { park } from "#example/commands/park.ts";
import { pieceChartered } from "#example/facts/piece-chartered.ts";
import { pieceLaunched } from "#example/facts/piece-launched.ts";
import { pieceParked } from "#example/facts/piece-parked.ts";
import { pieceCharteredMaterializer } from "#example/materializers/piece-chartered.ts";
import { pieceLaunchedMaterializer } from "#example/materializers/piece-launched.ts";
import { pieceParkedMaterializer } from "#example/materializers/piece-parked.ts";
import { Roster } from "#example/ports/roster.ts";
import { atWork } from "#example/queries/at-work.ts";
import { byVoyage } from "#example/queries/by-voyage.ts";
import { chartered } from "#example/queries/chartered.ts";
import { mustering } from "#example/reconcilers/mustering.ts";
import { parking } from "#example/reconcilers/parking.ts";
import { piece } from "#example/rows/piece.ts";

export const pieces = feature("pieces", {
	rows: [piece],
	facts: [pieceChartered, pieceLaunched, pieceParked],
	commands: [charter, launch, park],
	materializers: [pieceCharteredMaterializer, pieceLaunchedMaterializer, pieceParkedMaterializer],
	queries: [atWork, byVoyage, chartered],
	ports: [Roster],
	reconcilers: [mustering, parking],
});
