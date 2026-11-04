import { Effect } from "effect";
import { outcomes } from "#postgres/changes/outcomes.ts";
import { pieceChangesProjection } from "#postgres/changes/piece-changes.ts";
import { quayProjection } from "#postgres/changes/quay.ts";
import { repositoryCleanup } from "#postgres/changes/repository-cleanup.ts";
import { rows } from "#postgres/changes/rows.ts";
import { sessionSituationsProjection } from "#postgres/changes/session-situations.ts";
import { projectProgress } from "#postgres/pieces/progress.ts";
export const refresh = Effect.fn("ChangesHistory.refresh")(function* () {
	const handles = yield* rows;
	yield* outcomes.run(handles, handles);
	yield* quayProjection.run(handles, handles);
	yield* pieceChangesProjection.run(handles, handles);
	yield* sessionSituationsProjection.run(handles, handles);
	yield* projectProgress();
});

export const prune = Effect.fn("ChangesHistory.prune")(function* () {
	const handles = yield* rows;
	yield* repositoryCleanup.run(handles, handles);
	yield* refresh();
});
