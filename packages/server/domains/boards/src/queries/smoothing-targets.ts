import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { SmoothingTargetFields } from "@antumbra/platform-vocabulary/boards.ts";
import { Schema } from "effect";
import { boardEntry } from "#rows/board-entry.ts";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";

export const SmoothingTarget = Schema.Struct({ ...SmoothingTargetFields.fields, entries: Schema.Array(boardEntry.Row) });

export const smoothingTargets = query("smoothingTargets", {
	input: { id: Schema.String, now: Schema.String },
	output: Schema.Array(SmoothingTarget),
	reads: [smoothingAttempt, piece, pieceProgress, boardEntry],
});

export const PendingAttempt = Schema.Struct({ ...smoothingAttempt.fields, held: Schema.Boolean });

export const pendingSmoothing = query("pendingSmoothing", {
	input: {},
	output: Schema.Array(PendingAttempt),
	reads: [smoothingAttempt, flag, voyage],
});
