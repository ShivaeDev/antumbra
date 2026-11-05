import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { requestSmoothing } from "#commands/request-smoothing.ts";
import { boardEntry } from "#rows/board-entry.ts";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";

const Demand = Schema.Struct(requestSmoothing.input);

export const dueSmoothing = query("dueSmoothing", {
	input: { now: Schema.String },
	output: Schema.Array(Demand),
	reads: [smoothingAttempt, voyage, piece, pieceProgress, boardEntry],
});
