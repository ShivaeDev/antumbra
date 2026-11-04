import { Schema } from "effect";
import { BoardRegisterSchema, SummaryLevelSchema } from "#board.ts";
import { BoardEntryId, BoardId } from "#board-ids.ts";
import { Sequence, SmoothingAttempt, SmoothingBinding } from "#boards.ts";
import { PieceId } from "#piece.ts";
export const NoteWrittenPayload = Schema.Struct({
	id: BoardEntryId,
	board: BoardId,
	number: Sequence,
	register: BoardRegisterSchema,
	authorAgentId: Schema.NullOr(Schema.String),
	body: Schema.String,
});
export const SummaryWrittenPayload = Schema.Struct({
	id: BoardEntryId,
	board: BoardId,
	number: Sequence,
	authorAgentId: Schema.String,
	body: Schema.String,
	coversFrom: Sequence,
	coversTo: Sequence,
	level: SummaryLevelSchema,
});
export const PieceSummaryWrittenPayload = Schema.Struct({
	id: BoardEntryId,
	board: BoardId,
	number: Sequence,
	authorAgentId: Schema.String,
	body: Schema.String,
	pieceId: PieceId,
});
export const BoardSmoothingRequestedPayload = Schema.Struct({
	id: SmoothingAttempt.fields.id,
	voyageId: SmoothingAttempt.fields.voyageId,
	pieceId: SmoothingAttempt.fields.pieceId,
	throughToday: SmoothingAttempt.fields.throughToday,
	requestedAt: SmoothingAttempt.fields.requestedAt,
	by: SmoothingAttempt.fields.by,
});
export const SmoothingFinishedPayload = Schema.Struct({
	id: Schema.String,
	status: Schema.Literals(["succeeded", "failed"]),
	detail: Schema.NullOr(Schema.String),
});
export const SmoothingSessionBoundPayload = Schema.Struct(SmoothingBinding.fields);
export const SmoothingSessionFinishedPayload = Schema.Struct({
	sessionId: Schema.String,
	status: Schema.Literals(["written", "empty", "silent", "timedOut"]),
});
export const BoardsEvent = Schema.Union([
	Schema.Struct({ _tag: Schema.Literal("NoteWritten"), ...NoteWrittenPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("SummaryWritten"), ...SummaryWrittenPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("PieceSummaryWritten"), ...PieceSummaryWrittenPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("BoardSmoothingRequested"), ...BoardSmoothingRequestedPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("SmoothingFinished"), ...SmoothingFinishedPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("SmoothingSessionBound"), ...SmoothingSessionBoundPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("SmoothingSessionFinished"), ...SmoothingSessionFinishedPayload.fields, at: Schema.Number }),
]);
