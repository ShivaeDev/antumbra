import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { pieceBoard, voyageBoard } from "#ids.ts";
import { boardEntry } from "#rows/board-entry.ts";
import { smoothingAttempt } from "#smoothing/attempt.ts";
import { uncovered } from "#smoothing/span.ts";

export const smoothingState = query("smoothingState", {
	input: { voyageId: VoyageId },
	output: Schema.Struct({ state: Schema.Literals(["idle", "running", "failed"]), uncovered: Schema.Number }),
	reads: [smoothingAttempt, boardEntry, pieceProgress],
	scope: (input) => input.voyageId,
	run: Effect.fn("boards.smoothingState")(function* (input, rows) {
		const attempts = (yield* rows.smoothingAttempt.where({ voyageId: input.voyageId })).toSorted((left, right) =>
			right.requestedAt.localeCompare(left.requestedAt),
		);
		const running = attempts.some((attempt) => attempt.status === "requested");
		const settled = attempts[0]?.status === "failed" ? "failed" : "idle";
		const state = running ? "running" : settled;
		let count = uncovered(yield* rows.boardEntry.where({ board: voyageBoard(input.voyageId) })).length;
		for (const held of yield* rows.pieceProgress.where({ voyageId: input.voyageId, concluded: true }))
			count += uncovered(yield* rows.boardEntry.where({ board: pieceBoard(held.id) })).length;
		return { state, uncovered: count } as const;
	}),
});
