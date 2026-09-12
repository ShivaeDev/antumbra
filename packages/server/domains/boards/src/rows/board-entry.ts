import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { BoardRegisterSchema, SummaryLevelSchema } from "@antumbra/platform-vocabulary/board.ts";
import { Schema } from "effect";
import { BoardEntryId, BoardId } from "#ids.ts";

export const BoardEntryKind = Schema.Literals(["note", "pieceSummary", "summary"]);
export type BoardEntryKind = typeof BoardEntryKind.Type;

export const Sequence = Schema.Number.check(Schema.isInt());

export const boardEntry = row(
	"boardEntry",
	{
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
	},
	{ key: "id", scope: "board" },
);
