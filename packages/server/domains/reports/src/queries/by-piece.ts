import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { pieceReport } from "#rows/piece-report.ts";
import { report } from "#rows/report.ts";

export const byPiece = query("byPiece", {
	input: { pieceId: PieceId },
	output: Schema.Array(Schema.Struct({ id: report.fields.id, title: report.fields.title, authorAgentId: report.fields.authorAgentId })),
	reads: [report, pieceReport],
});
