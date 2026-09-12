import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { requestSmoothing } from "#commands/request-smoothing.ts";
import { pieceBoard } from "#ids.ts";
import { localDay, span } from "#queries/smoothing-span.ts";
import { boardEntry } from "#rows/board-entry.ts";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";

const Demand = Schema.Struct(requestSmoothing.input);

export const dueSmoothing = query("dueSmoothing", {
	input: { now: Schema.String },
	output: Schema.Array(Demand),
	reads: [smoothingAttempt, voyage, piece, pieceProgress, boardEntry],
	run: Effect.fn("boards.dueSmoothing")(function* (input, rows) {
		const attempts = yield* rows.smoothingAttempt.where({});
		const today = localDay(new Date(input.now));
		const voyages = yield* rows.voyage.where({});
		const demands: Array<typeof Demand.Type> = [];
		for (const held of voyages) {
			if (!attempts.some((attempt) => attempt.pieceId === null && attempt.voyageId === held.id && localDay(new Date(attempt.requestedAt)) >= today))
				demands.push({ voyageId: held.id, pieceId: null, throughToday: false });
		}
		const concluded = new Set((yield* rows.pieceProgress.where({ concluded: true })).map((progress) => progress.id));
		for (const held of yield* rows.piece.where({})) {
			if (!concluded.has(held.id) || attempts.some((attempt) => attempt.pieceId === held.id)) continue;
			if (span(yield* rows.boardEntry.where({ board: pieceBoard(held.id) })) !== undefined)
				demands.push({ voyageId: held.voyageId, pieceId: held.id, throughToday: false });
		}
		return demands;
	}),
});
