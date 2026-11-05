import { requestSmoothing } from "@antumbra/domain-boards/commands/request-smoothing.ts";
import type * as Source from "@antumbra/domain-boards/queries/due-smoothing.ts";
import { localDay, span } from "@antumbra/domain-boards/queries/smoothing-span.ts";
import { pieceBoard } from "@antumbra/platform-vocabulary/board-ids.ts";
import { selection as boardEntrySelection } from "@antumbra/server-storage/records/board-entry.ts";
import { selection as pieceSelection } from "@antumbra/server-storage/records/piece.ts";
import { selection as pieceProgressSelection } from "@antumbra/server-storage/records/piece-progress.ts";
import { selection as smoothingAttemptSelection } from "@antumbra/server-storage/records/smoothing-attempt.ts";
import { selection as voyageSelection } from "@antumbra/server-storage/records/voyage.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";

const Demand = Schema.Struct(requestSmoothing.input);

export const dueSmoothing = Effect.fn("boards.dueSmoothing")(function* (
	input: Schema.Struct.Type<typeof Source.dueSmoothing.input>,
): Effect.fn.Return<typeof Source.dueSmoothing.output.Type, never, Records> {
	const rows = yield* Records;

	const attempts = yield* rows.smoothingAttempt
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: smoothingAttemptSelection })
		.pipe(Effect.orDie);
	const today = localDay(new Date(input.now));
	const voyages = yield* rows.voyage
		.findMany({ where: {}, orderBy: { field: "opened_order", direction: "asc" }, select: voyageSelection })
		.pipe(Effect.orDie);
	const demands: Array<typeof Demand.Type> = [];
	for (const held of voyages) {
		if (!attempts.some((attempt) => attempt.pieceId === null && attempt.voyageId === held.id && localDay(new Date(attempt.requestedAt)) >= today))
			demands.push({ voyageId: held.id, pieceId: null, throughToday: false, by: "antumbra" });
	}
	const concluded = new Set(
		(yield* rows.pieceProgress
			.findMany({ where: { concluded: true }, orderBy: { field: "id", direction: "asc" }, select: pieceProgressSelection })
			.pipe(Effect.orDie)).map((progress) => progress.id),
	);
	for (const held of yield* rows.piece
		.findMany({ where: {}, orderBy: { field: "chartered_order", direction: "asc" }, select: pieceSelection })
		.pipe(Effect.orDie)) {
		if (!concluded.has(held.id) || attempts.some((attempt) => attempt.pieceId === held.id)) continue;
		if (
			span(
				yield* rows.boardEntry
					.findMany({ where: { board: pieceBoard(held.id) }, orderBy: { field: "storage_order", direction: "asc" }, select: boardEntrySelection })
					.pipe(Effect.orDie),
			) !== undefined
		)
			demands.push({ voyageId: held.voyageId, pieceId: held.id, throughToday: false, by: "antumbra" });
	}
	return demands;
});
