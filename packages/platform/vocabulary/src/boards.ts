import { Schema } from "effect";
import { BoardRegisterSchema, SummaryLevelSchema } from "#board.ts";
import { BoardEntryId, BoardId } from "#board-ids.ts";
import { PieceId } from "#piece.ts";
import { VoyageId } from "#voyage.ts";
export const Sequence = Schema.Number.check(Schema.isInt());
export const BoardEntryKind = Schema.Literals(["note", "pieceSummary", "summary"]);
export type BoardEntryKind = typeof BoardEntryKind.Type;
export const BoardEntry = Schema.Struct({
	id: BoardEntryId,
	board: BoardId,
	seq: Sequence,
	kind: BoardEntryKind,
	register: BoardRegisterSchema,
	authorAgentId: Schema.NullOr(Schema.String),
	body: Schema.String,
	level: Schema.NullOr(SummaryLevelSchema),
	coversFrom: Schema.NullOr(Sequence),
	coversTo: Schema.NullOr(Sequence),
	pieceId: Schema.NullOr(PieceId),
	createdAt: Schema.String,
});
export const SmoothingAttempt = Schema.Struct({
	id: Schema.String,
	voyageId: VoyageId,
	pieceId: Schema.NullOr(PieceId),
	throughToday: Schema.Boolean,
	requestedAt: Schema.String,
	by: Schema.Literals(["admiral", "antumbra"]),
	status: Schema.Literals(["requested", "succeeded", "failed"]),
	detail: Schema.NullOr(Schema.String),
});
export const SmoothingTargetFields = Schema.Struct({
	coversFrom: Sequence,
	coversTo: Sequence,
	board: BoardId,
	pieceId: Schema.NullOr(PieceId),
	title: Schema.String,
	level: SummaryLevelSchema,
});
export const SmoothingBinding = Schema.Struct({
	sessionId: Schema.String,
	attemptId: Schema.String,
	agentId: Schema.String,
	...SmoothingTargetFields.fields,
});
export const SmoothingSession = Schema.Struct({
	...SmoothingBinding.fields,
	status: Schema.Literals(["waiting", "written", "empty", "silent", "timedOut"]),
});
