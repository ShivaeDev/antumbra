import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Clock, Effect, Schema } from "effect";
import { reportLanded } from "#facts/report-landed.ts";
import { ReportId } from "#ids.ts";
import { report } from "#rows/report.ts";

export const land = command("land", {
	input: { pieceId: PieceId, authorAgentId: report.fields.authorAgentId, title: report.fields.title, body: report.fields.body },
	reads: [piece],
	emits: reportLanded,
	rejections: { PieceNotFound: { pieceId: Schema.String } },
	run: Effect.fn("reports.land")(function* (input, rows, reject) {
		if (!(yield* rows.piece.exists(input.pieceId))) return yield* reject.PieceNotFound({ pieceId: input.pieceId });
		const at = yield* Clock.currentTimeMillis;
		return {
			id: ReportId.make(input.requestId),
			authorAgentId: input.authorAgentId,
			body: input.body,
			title: input.title,
			pieceId: input.pieceId,
			createdAt: new Date(at).toISOString(),
		};
	}),
});
