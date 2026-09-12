import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceOutcome } from "@antumbra/domain-pieces/rows/piece-outcome.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { land } from "#commands/land.ts";
import { reportLanded } from "#facts/report-landed.ts";
import { reportLandedMaterializer } from "#materializers/report-landed.ts";
import { byId } from "#queries/by-id.ts";
import { byPiece } from "#queries/by-piece.ts";
import { forVoyage } from "#queries/for-voyage.ts";
import { pieceReport } from "#rows/piece-report.ts";
import { report } from "#rows/report.ts";

export const reports = feature("reports", {
	rows: [report, pieceReport, piece, pieceOutcome],
	facts: [reportLanded],
	commands: [land],
	materializers: [reportLandedMaterializer],
	queries: [byId, byPiece, forVoyage],
});
