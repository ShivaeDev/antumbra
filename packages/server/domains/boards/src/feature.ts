import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { bindSmoothingSession } from "#commands/bind-smoothing-session.ts";
import { finishSmoothing } from "#commands/finish-smoothing.ts";
import { finishSmoothingSession } from "#commands/finish-smoothing-session.ts";
import { requestSmoothing } from "#commands/request-smoothing.ts";
import { summarize } from "#commands/summarize.ts";
import { summarizePiece } from "#commands/summarize-piece.ts";
import { write } from "#commands/write.ts";
import { noteWritten } from "#facts/note-written.ts";
import { pieceSummaryWritten } from "#facts/piece-summary-written.ts";
import { smoothingFinished } from "#facts/smoothing-finished.ts";
import { smoothingRequested } from "#facts/smoothing-requested.ts";
import { smoothingSessionBound } from "#facts/smoothing-session-bound.ts";
import { smoothingSessionFinished } from "#facts/smoothing-session-finished.ts";
import { summaryWritten } from "#facts/summary-written.ts";
import { noteWrittenMaterializer } from "#materializers/note-written.ts";
import { pieceSummaryWrittenMaterializer } from "#materializers/piece-summary-written.ts";
import { smoothingFinishedMaterializer } from "#materializers/smoothing-finished.ts";
import { smoothingRequestedMaterializer } from "#materializers/smoothing-requested.ts";
import { smoothingSessionBoundMaterializer } from "#materializers/smoothing-session-bound.ts";
import { smoothingSessionFinishedMaterializer } from "#materializers/smoothing-session-finished.ts";
import { summaryWrittenMaterializer } from "#materializers/summary-written.ts";
import { digest } from "#queries/digest.ts";
import { display } from "#queries/display.ts";
import { dueSmoothing } from "#queries/due-smoothing.ts";
import { entries } from "#queries/entries.ts";
import { smoothingSessionFor } from "#queries/smoothing-session-for.ts";
import { smoothingState } from "#queries/smoothing-state.ts";
import { pendingSmoothing, smoothingTargets } from "#queries/smoothing-targets.ts";
import { under } from "#queries/under.ts";
import { boardEntry } from "#rows/board-entry.ts";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";
import { smoothingSession } from "#rows/smoothing-session.ts";

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
	queries: [display, entries, digest, under, dueSmoothing, smoothingTargets, pendingSmoothing, smoothingSessionFor, smoothingState],
});
