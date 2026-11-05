import { days, localDay, span } from "@antumbra/domain-boards/queries/smoothing-span.ts";
import type * as Source from "@antumbra/domain-boards/queries/smoothing-targets.ts";
import { boardEntry } from "@antumbra/domain-boards/rows/board-entry.ts";
import { smoothingAttempt, smoothingAttempt as smoothingAttemptRecordSchema } from "@antumbra/domain-boards/rows/smoothing-attempt.ts";
import { allows } from "@antumbra/domain-settings/queries/flags.ts";
import { quietIds } from "@antumbra/domain-voyages/rows/voyage.ts";
import { pieceBoard, voyageBoard } from "@antumbra/platform-vocabulary/board-ids.ts";
import { SmoothingTargetFields } from "@antumbra/platform-vocabulary/boards.ts";
import { FLEET } from "@antumbra/platform-vocabulary/settings-ids.ts";
import { selection as boardEntrySelection } from "@antumbra/server-storage/records/board-entry.ts";
import { selection as flagSelection } from "@antumbra/server-storage/records/flag.ts";
import { selection as pieceSelection } from "@antumbra/server-storage/records/piece.ts";
import { selection as pieceProgressSelection } from "@antumbra/server-storage/records/piece-progress.ts";
import { selection as smoothingAttemptSelection } from "@antumbra/server-storage/records/smoothing-attempt.ts";
import { selection as voyageSelection } from "@antumbra/server-storage/records/voyage.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";

export const SmoothingTarget = Schema.Struct({ ...SmoothingTargetFields.fields, entries: Schema.Array(boardEntry.Row) });

export const smoothingTargets = Effect.fn("boards.smoothingTargets")(function* (
	input: Schema.Struct.Type<typeof Source.smoothingTargets.input>,
): Effect.fn.Return<typeof Source.smoothingTargets.output.Type, never, Records> {
	const rows = yield* Records;

	const attempt = yield* rows.smoothingAttempt
		.findById(input.id)
		.pipe(Effect.flatMap(Schema.decodeUnknownEffect(smoothingAttemptRecordSchema.Row)), Effect.orDie);
	const targets: Array<typeof SmoothingTarget.Type> = [];
	const concluded = new Set(
		(yield* rows.pieceProgress
			.findMany({
				where: { voyageId: attempt.voyageId, concluded: true },
				orderBy: { field: "id", direction: "asc" },
				select: pieceProgressSelection,
			})
			.pipe(Effect.orDie)).map((held) => held.id),
	);
	for (const held of yield* rows.piece
		.findMany({ where: { voyageId: attempt.voyageId }, orderBy: { field: "chartered_order", direction: "asc" }, select: pieceSelection })
		.pipe(Effect.orDie)) {
		if (!concluded.has(held.id) || (attempt.pieceId !== null && held.id !== attempt.pieceId)) continue;
		const board = pieceBoard(held.id);
		const uncovered = span(
			yield* rows.boardEntry
				.findMany({ where: { board }, orderBy: { field: "storage_order", direction: "asc" }, select: boardEntrySelection })
				.pipe(Effect.orDie),
		);
		if (uncovered !== undefined) targets.push({ ...uncovered, board, pieceId: held.id, title: held.title, level: "piece" });
	}
	if (attempt.pieceId === null) {
		const board = voyageBoard(attempt.voyageId);
		const today = localDay(new Date(input.now));
		for (const day of days(
			yield* rows.boardEntry
				.findMany({ where: { board }, orderBy: { field: "storage_order", direction: "asc" }, select: boardEntrySelection })
				.pipe(Effect.orDie),
		)) {
			if (attempt.throughToday || day.day < today)
				targets.push({
					coversFrom: day.coversFrom,
					coversTo: day.coversTo,
					entries: day.entries,
					board,
					pieceId: null,
					title: day.day,
					level: "day",
				});
		}
	}
	return targets;
});

export const PendingAttempt = Schema.Struct({ ...smoothingAttempt.fields, held: Schema.Boolean });

export const pendingSmoothing = Effect.fn("boards.pendingSmoothing")(function* (
	_input: Schema.Struct.Type<typeof Source.pendingSmoothing.input>,
): Effect.fn.Return<typeof Source.pendingSmoothing.output.Type, never, Records> {
	const rows = yield* Records;

	const spawning = allows(
		yield* rows.flag
			.findMany({ where: { scope: FLEET }, orderBy: { field: "storage_order", direction: "asc" }, select: flagSelection })
			.pipe(Effect.orDie),
		"spawnSmoother",
	);
	const quiet = quietIds(
		yield* rows.voyage.findMany({ where: {}, orderBy: { field: "opened_order", direction: "asc" }, select: voyageSelection }).pipe(Effect.orDie),
	);
	const requested = yield* rows.smoothingAttempt
		.findMany({ where: { status: "requested" }, orderBy: { field: "storage_order", direction: "asc" }, select: smoothingAttemptSelection })
		.pipe(Effect.orDie);
	return requested
		.toSorted((left, right) => left.requestedAt.localeCompare(right.requestedAt))
		.map((attempt) => ({ ...attempt, held: attempt.by !== "admiral" && (!spawning || quiet.has(attempt.voyageId)) }));
});
