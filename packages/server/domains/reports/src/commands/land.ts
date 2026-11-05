import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { reportLanded } from "#facts/report-landed.ts";
import { report } from "#rows/report.ts";

export const land = command("land", {
	input: { pieceId: PieceId, authorAgentId: report.fields.authorAgentId, title: report.fields.title, body: report.fields.body },
	reads: [piece],
	emits: reportLanded,
	rejections: { PieceNotFound: { pieceId: Schema.String } },
});
