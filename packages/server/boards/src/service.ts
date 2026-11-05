import { BoardsHistory } from "@antumbra/server-storage/boards/service.ts";
import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { bindSmoothingSession } from "#commands/bind-smoothing-session.ts";
import { finishSmoothing } from "#commands/finish-smoothing.ts";
import { finishSmoothingSession } from "#commands/finish-smoothing-session.ts";
import { requestSmoothing } from "#commands/request-smoothing.ts";
import { summarize } from "#commands/summarize.ts";
import { summarizePiece } from "#commands/summarize-piece.ts";
import { write } from "#commands/write.ts";
import { initialize } from "#initialize.ts";
import { digest } from "#queries/digest.ts";
import { display } from "#queries/display.ts";
import { dueSmoothing } from "#queries/due-smoothing.ts";
import { entries } from "#queries/entries.ts";
import { smoothingSessionFor } from "#queries/smoothing-session-for.ts";
import { smoothingState } from "#queries/smoothing-state.ts";
import { pendingSmoothing } from "#queries/smoothing-targets.ts";
import { smoothingTargets } from "#queries/targets.ts";
import { under } from "#queries/under.ts";
export const Boards = defineService({
	id: "@antumbra/server-boards/Boards",
	requires: [ExecutionHistory, Records, BoardsHistory],
	initialize: initialize,
	methods: (serial) => ({
		write: write(serial),
		summarize: summarize(serial),
		summarizePiece: summarizePiece(serial),
		requestSmoothing: requestSmoothing(serial),
		finishSmoothing: finishSmoothing(serial),
		bindSmoothingSession: bindSmoothingSession(serial),
		finishSmoothingSession: finishSmoothingSession(serial),
		display,
		entries,
		digest,
		under,
		dueSmoothing,
		smoothingTargets,
		pendingSmoothing,
		smoothingSessionFor,
		smoothingState,
	}),
});
