import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { pieceReport } from "#rows/piece-report.ts";
import { report } from "#rows/report.ts";

export const byPiece = query("byPiece", {
	input: { pieceId: PieceId },
	output: Schema.Array(Schema.Struct({ id: report.fields.id, title: report.fields.title, authorAgentId: report.fields.authorAgentId })),
	reads: [report, pieceReport],
	run: Effect.fn("reports.byPiece")(function* (input, rows) {
		const links = yield* rows.pieceReport.where({ pieceId: input.pieceId });
		return yield* Effect.forEach(links, (link) => rows.report.get(link.reportId));
	}),
});
