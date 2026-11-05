import { uncovered } from "@antumbra/domain-boards/queries/smoothing-span.ts";
import type * as Source from "@antumbra/domain-boards/queries/smoothing-state.ts";
import { pieceBoard, voyageBoard } from "@antumbra/platform-vocabulary/board-ids.ts";
import { selection as boardEntrySelection } from "@antumbra/server-storage/records/board-entry.ts";
import { selection as pieceProgressSelection } from "@antumbra/server-storage/records/piece-progress.ts";
import { selection as smoothingAttemptSelection } from "@antumbra/server-storage/records/smoothing-attempt.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const smoothingState = Effect.fn("boards.smoothingState")(function* (
	input: Schema.Struct.Type<typeof Source.smoothingState.input>,
): Effect.fn.Return<typeof Source.smoothingState.output.Type, never, Records> {
	const rows = yield* Records;

	const attempts = (yield* rows.smoothingAttempt
		.findMany({ where: { voyageId: input.voyageId }, orderBy: { field: "storage_order", direction: "asc" }, select: smoothingAttemptSelection })
		.pipe(Effect.orDie))
		.toReversed()
		.toSorted((left, right) => right.requestedAt.localeCompare(left.requestedAt));
	const running = attempts.some((attempt) => attempt.status === "requested");
	const settled = attempts[0]?.status === "failed" ? "failed" : "idle";
	const state = running ? "running" : settled;
	let count = uncovered(
		yield* rows.boardEntry
			.findMany({ where: { board: voyageBoard(input.voyageId) }, orderBy: { field: "storage_order", direction: "asc" }, select: boardEntrySelection })
			.pipe(Effect.orDie),
	).length;
	for (const held of yield* rows.pieceProgress
		.findMany({ where: { voyageId: input.voyageId, concluded: true }, orderBy: { field: "id", direction: "asc" }, select: pieceProgressSelection })
		.pipe(Effect.orDie))
		count += uncovered(
			yield* rows.boardEntry
				.findMany({ where: { board: pieceBoard(held.id) }, orderBy: { field: "storage_order", direction: "asc" }, select: boardEntrySelection })
				.pipe(Effect.orDie),
		).length;
	return { state, uncovered: count } as const;
});
