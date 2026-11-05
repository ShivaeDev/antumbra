import { Effect } from "effect";
import { outcomes } from "#projections/changes/outcomes.ts";
import { pieceChangesProjection } from "#projections/changes/piece-changes.ts";
import { quayProjection } from "#projections/changes/quay.ts";
import { repositoryCleanup } from "#projections/changes/repository-cleanup.ts";
import { sessionSituationsProjection } from "#projections/changes/session-situations.ts";
export const refresh = Effect.fn("ChangesHistory.refresh")(function* () {
	yield* outcomes();
	yield* quayProjection();
	yield* pieceChangesProjection();
	yield* sessionSituationsProjection();
});

export const prune = Effect.fn("ChangesHistory.prune")(function* () {
	yield* repositoryCleanup();
	yield* refresh();
});
