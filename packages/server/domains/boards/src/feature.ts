import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { summarize } from "#commands/summarize.ts";
import { summarizePiece } from "#commands/summarize-piece.ts";
import { write } from "#commands/write.ts";
import { noteWritten } from "#facts/note-written.ts";
import { pieceSummaryWritten } from "#facts/piece-summary-written.ts";
import { summaryWritten } from "#facts/summary-written.ts";
import { noteWrittenMaterializer } from "#materializers/note-written.ts";
import { pieceSummaryWrittenMaterializer } from "#materializers/piece-summary-written.ts";
import { summaryWrittenMaterializer } from "#materializers/summary-written.ts";
import { digest } from "#queries/digest.ts";
import { entries } from "#queries/entries.ts";
import { under } from "#queries/under.ts";
import { boardEntry } from "#rows/board-entry.ts";
import { smoothingAttempt } from "#smoothing/attempt.ts";
import { dueSmoothing } from "#smoothing/due.ts";
import { finishSmoothing, smoothingFinished, smoothingFinishedMaterializer } from "#smoothing/finished.ts";
import { requestSmoothing, smoothingRequested, smoothingRequestedMaterializer } from "#smoothing/requested.ts";
import {
	bindSmoothingSession,
	finishSmoothingSession,
	smoothingSession,
	smoothingSessionBound,
	smoothingSessionBoundMaterializer,
	smoothingSessionFinished,
	smoothingSessionFinishedMaterializer,
	smoothingSessionFor,
} from "#smoothing/session.ts";
import { smoothingState } from "#smoothing/state.ts";
import { pendingSmoothing, smoothingTargets } from "#smoothing/targets.ts";

export const boards = feature("boards", {
	rows: [boardEntry, piece, voyage, smoothingAttempt, pieceProgress, smoothingSession],
	facts: [noteWritten, summaryWritten, pieceSummaryWritten, smoothingRequested, smoothingFinished, smoothingSessionBound, smoothingSessionFinished],
	commands: [write, summarize, summarizePiece, requestSmoothing, finishSmoothing, bindSmoothingSession, finishSmoothingSession],
	materializers: [
		noteWrittenMaterializer,
		summaryWrittenMaterializer,
		pieceSummaryWrittenMaterializer,
		smoothingRequestedMaterializer,
		smoothingFinishedMaterializer,
		smoothingSessionBoundMaterializer,
		smoothingSessionFinishedMaterializer,
	],
	queries: [entries, digest, under, dueSmoothing, smoothingTargets, pendingSmoothing, smoothingSessionFor, smoothingState],
});
