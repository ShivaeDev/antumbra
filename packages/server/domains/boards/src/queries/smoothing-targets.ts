import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { BoardId, pieceBoard, voyageBoard } from "#ids.ts";
import { days, localDay, Span, span } from "#queries/smoothing-span.ts";
import { boardEntry } from "#rows/board-entry.ts";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";

export const SmoothingTarget = Schema.Struct({
	...Span.fields,
	board: BoardId,
	pieceId: smoothingAttempt.fields.pieceId,
	title: Schema.String,
	level: Schema.Literals(["piece", "day"]),
});

export const smoothingTargets = query("smoothingTargets", {
	input: { id: Schema.String, now: Schema.String },
	output: Schema.Array(SmoothingTarget),
	reads: [smoothingAttempt, piece, pieceProgress, boardEntry],
	run: Effect.fn("boards.smoothingTargets")(function* (input, rows) {
		const attempt = yield* rows.smoothingAttempt.get(input.id);
		const targets: Array<typeof SmoothingTarget.Type> = [];
		const concluded = new Set((yield* rows.pieceProgress.where({ voyageId: attempt.voyageId, concluded: true })).map((held) => held.id));
		for (const held of yield* rows.piece.where({ voyageId: attempt.voyageId })) {
			if (!concluded.has(held.id) || (attempt.pieceId !== null && held.id !== attempt.pieceId)) continue;
			const board = pieceBoard(held.id);
			const uncovered = span(yield* rows.boardEntry.where({ board }));
			if (uncovered !== undefined) targets.push({ ...uncovered, board, pieceId: held.id, title: held.title, level: "piece" });
		}
		if (attempt.pieceId === null) {
			const board = voyageBoard(attempt.voyageId);
			const today = localDay(new Date(input.now));
			for (const day of days(yield* rows.boardEntry.where({ board }))) {
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
	}),
});

export const pendingSmoothing = query("pendingSmoothing", {
	input: {},
	output: Schema.Array(smoothingAttempt.Row),
	reads: [smoothingAttempt],
	run: Effect.fn("boards.pendingSmoothing")(function* (_input, rows) {
		return (yield* rows.smoothingAttempt.where({ status: "requested" })).toSorted((left, right) => left.requestedAt.localeCompare(right.requestedAt));
	}),
});
