import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceOutcome } from "@antumbra/domain-pieces/rows/piece-outcome.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { removeSupersession } from "#commands/remove-supersession.ts";
import { supersede } from "#commands/supersede.ts";
import { artifactLanded } from "#facts/landed.ts";
import { artifactSuperseded } from "#facts/superseded.ts";
import { artifactSupersessionRemoved } from "#facts/supersession-removed.ts";
import { landedMaterializer } from "#materializers/landed.ts";
import { supersededMaterializer } from "#materializers/superseded.ts";
import { supersessionRemovedMaterializer } from "#materializers/supersession-removed.ts";
import { byId } from "#queries/by-id.ts";
import { byPiece } from "#queries/by-piece.ts";
import { artifact } from "#rows/artifact.ts";
export const artifacts = feature("artifacts", {
	rows: [artifact, piece, pieceOutcome],
	facts: [artifactLanded, artifactSuperseded, artifactSupersessionRemoved],
	commands: [supersede, removeSupersession],
	materializers: [landedMaterializer, supersededMaterializer, supersessionRemovedMaterializer],
	queries: [byId, byPiece],
});
