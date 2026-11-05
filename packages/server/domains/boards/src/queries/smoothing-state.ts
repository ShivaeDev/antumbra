import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { boardEntry } from "#rows/board-entry.ts";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";

export const smoothingState = query("smoothingState", {
	input: { voyageId: VoyageId },
	output: Schema.Struct({ state: Schema.Literals(["idle", "running", "failed"]), uncovered: Schema.Number }),
	reads: [smoothingAttempt, boardEntry, pieceProgress],
});
