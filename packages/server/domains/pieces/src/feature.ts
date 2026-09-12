import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { voyagePieceProgress } from "@antumbra/domain-voyages/rows/voyage-piece-progress.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { charter } from "#commands/charter.ts";
import { landVerdict } from "#commands/land-verdict.ts";
import { launch } from "#commands/launch.ts";
import { park } from "#commands/park.ts";
import { rewire } from "#commands/rewire.ts";
import { unpark } from "#commands/unpark.ts";
import { pieceChartered } from "#facts/piece-chartered.ts";
import { pieceLaunched } from "#facts/piece-launched.ts";
import { pieceParked } from "#facts/piece-parked.ts";
import { pieceRewired } from "#facts/piece-rewired.ts";
import { pieceUnparked } from "#facts/piece-unparked.ts";
import { pieceVerdictLanded } from "#facts/piece-verdict-landed.ts";
import { pieceCharteredMaterializer } from "#materializers/piece-chartered.ts";
import { pieceLaunchedMaterializer } from "#materializers/piece-launched.ts";
import { pieceParkedMaterializer } from "#materializers/piece-parked.ts";
import { pieceRewiredMaterializer } from "#materializers/piece-rewired.ts";
import { pieceUnparkedMaterializer } from "#materializers/piece-unparked.ts";
import { pieceVerdictLandedMaterializer } from "#materializers/piece-verdict-landed.ts";
import { all } from "#queries/all.ts";
import { byId } from "#queries/by-id.ts";
import { byVoyage } from "#queries/by-voyage.ts";
import { dependencies } from "#queries/dependencies.ts";
import { displayByVoyage } from "#queries/display-by-voyage.ts";
import { edges } from "#queries/edges.ts";
import { progress } from "#queries/progress.ts";
import { reach } from "#queries/reach.ts";
import { ready } from "#queries/ready.ts";
import { piece } from "#rows/piece.ts";
import { pieceAssignmentWork } from "#rows/piece-assignment-work.ts";
import { pieceEdge } from "#rows/piece-edge.ts";
import { pieceOutcome } from "#rows/piece-outcome.ts";
import { pieceProgress } from "#rows/piece-progress.ts";
import { pieceRulingGate } from "#rows/piece-ruling-gate.ts";

export const pieces = feature("pieces", {
	rows: [voyagePieceProgress, pieceOutcome, pieceAssignmentWork, pieceRulingGate, pieceProgress, piece, pieceEdge, voyage],
	facts: [pieceChartered, pieceLaunched, pieceParked, pieceUnparked, pieceRewired, pieceVerdictLanded],
	commands: [charter, launch, park, unpark, rewire, landVerdict],
	materializers: [
		pieceCharteredMaterializer,
		pieceLaunchedMaterializer,
		pieceParkedMaterializer,
		pieceUnparkedMaterializer,
		pieceRewiredMaterializer,
		pieceVerdictLandedMaterializer,
	],
	queries: [ready, dependencies, displayByVoyage, reach, progress, byVoyage, byId, edges, all],
});
