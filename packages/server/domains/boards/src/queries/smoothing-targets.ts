import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { allows } from "@antumbra/domain-settings/queries/flags.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { quietIds, voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { pieceBoard, voyageBoard } from "@antumbra/platform-vocabulary/board-ids.ts";
import { SmoothingTargetFields } from "@antumbra/platform-vocabulary/boards.ts";
import { FLEET } from "@antumbra/platform-vocabulary/settings-ids.ts";
import { Effect, Schema } from "effect";
import { days, localDay, span } from "#queries/smoothing-span.ts";
import { boardEntry } from "#rows/board-entry.ts";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";

export const SmoothingTarget = Schema.Struct({ ...SmoothingTargetFields.fields, entries: Schema.Array(boardEntry.Row) });

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

export const PendingAttempt = Schema.Struct({ ...smoothingAttempt.fields, held: Schema.Boolean });

export const pendingSmoothing = query("pendingSmoothing", {
	input: {},
	output: Schema.Array(PendingAttempt),
	reads: [smoothingAttempt, flag, voyage],
	run: Effect.fn("boards.pendingSmoothing")(function* (_input, rows) {
		const spawning = allows(yield* rows.flag.where({ scope: FLEET }), "spawnSmoother");
		const quiet = quietIds(yield* rows.voyage.where({}));
		const requested = yield* rows.smoothingAttempt.where({ status: "requested" });
		return requested
			.toSorted((left, right) => left.requestedAt.localeCompare(right.requestedAt))
			.map((attempt) => ({ ...attempt, held: attempt.by !== "admiral" && (!spawning || quiet.has(attempt.voyageId)) }));
	}),
});
